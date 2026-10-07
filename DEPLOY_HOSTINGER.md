# Hostinger VM Deployment

## 1. Server setup

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git nginx
```

## 2. Clone and install

```bash
cd /var/www
sudo git clone https://github.com/Shubhampande28/stockmarket_dashboard.git stock-dashboard
sudo chown -R $USER:$USER /var/www/stock-dashboard
cd /var/www/stock-dashboard
python3 -m venv backend/venv
backend/venv/bin/pip install -r backend/requirements.txt
```

## 3. Environment

Create `/var/www/stock-dashboard/.env`:

```bash
UPSTOX_CLIENT_ID=your_upstox_api_key
UPSTOX_CLIENT_SECRET=your_upstox_api_secret
UPSTOX_REDIRECT_URI=https://your-domain.com/callback
# 1-year Analytics Token (Upstox Developer Apps -> Analytics tab -> Generate
# Token). Read first by token_manager.load_token(); the OAuth flow above is
# now only an emergency fallback -- see section 7.
UPSTOX_ACCESS_TOKEN=your_upstox_analytics_token
ADMIN_USERNAME=use_a_real_username
ADMIN_PASSWORD=use_a_fresh_strong_password
FLASK_SECRET_KEY=use_a_long_random_secret
OPENAI_API_KEY=optional_for_news_summaries
APIFY_TOKEN=optional_for_screener_financials
APIFY_SCREENER_ACTOR_ID=optional_actor_id_or_username/actor-name
# Starts the in-process scheduler (snapshot/eod/fii/brief/premarket jobs) --
# only gunicorn needs this, never a local dev run or `python -m jobs ...`.
EQUILYTICS_RUN_SCHEDULER=1
PORT=5000
```

The same callback URL must be registered in your Upstox developer app. There
is no hard-coded admin username/password fallback: ADMIN_USERNAME and
ADMIN_PASSWORD must both be set, or the admin login route refuses every
attempt.

## 4. Systemd service

Create `/etc/systemd/system/stock-dashboard.service`:

```ini
[Unit]
Description=Stock Dashboard Flask App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/stock-dashboard
EnvironmentFile=/var/www/stock-dashboard/.env
ExecStart=/var/www/stock-dashboard/backend/venv/bin/gunicorn --chdir backend --bind 127.0.0.1:5000 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo chown -R www-data:www-data /var/www/stock-dashboard
sudo systemctl daemon-reload
sudo systemctl enable stock-dashboard
sudo systemctl start stock-dashboard
sudo systemctl status stock-dashboard
```

## 5. Nginx reverse proxy

Create `/etc/nginx/sites-available/stock-dashboard`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/stock-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7. Token setup and renewal (once a year, not daily)

The Analytics Token in `.env` replaces the old daily OAuth refresh -- it's valid
for about a year. After first setting `UPSTOX_ACCESS_TOKEN` (or whenever you
rotate it), run the one-time checks and backfill from the server:

```bash
cd /var/www/stock-dashboard/backend
../backend/venv/bin/python -m jobs selftest
../backend/venv/bin/python -m jobs backfill
../backend/venv/bin/python -m jobs eod --force
../backend/venv/bin/python -m jobs brief --force
cd ..
sudo systemctl restart stock-dashboard
```

`selftest` checks the token, a quote batch, VIX, one candle series, and NSE
FII/DII before you run the slower `backfill` (about 6 minutes for ~1,650
instruments at the API's 5 req/s candle limit). `/admin`'s Status panel shows
the token's expiry and a warning once it's 30 days or less from expiring.

**Set a reminder for 11 months from whenever you generate the token** --
generate a fresh one in the Upstox Developer Apps Analytics tab, replace the
`UPSTOX_ACCESS_TOKEN` line in `.env`, and `sudo systemctl restart
stock-dashboard`. The OAuth **Login with Upstox** flow at `/admin` still
works as an emergency fallback if the Analytics Token is ever unavailable.

## 7a. Routine redeploy (pulling new commits on this branch)

```bash
cd /var/www/stock-dashboard
git fetch && git checkout revamp-mood && git pull
backend/venv/bin/pip install -r backend/requirements.txt
# add the UPSTOX_ACCESS_TOKEN line to .env if it's not there yet (section 3)
cd backend && ../backend/venv/bin/python -m jobs selftest && ../backend/venv/bin/python -m jobs backfill && cd ..
sudo chown -R www-data:www-data /var/www/stock-dashboard
sudo systemctl restart stock-dashboard
```

## 8. Optional Apify Screener financials

If you want P&L, balance sheet, and cash flow from an Apify Screener actor instead of the Yahoo fallback, add these to `.env`:

```bash
APIFY_TOKEN=your_apify_api_token
APIFY_SCREENER_ACTOR_ID=username/actor-name
```

Then restart:

```bash
sudo systemctl restart stock-dashboard
```

The backend calls the actor first, caches normalized annual statements for 30 days, and falls back to Yahoo/NSE if Apify is not configured or returns no usable statement rows.
