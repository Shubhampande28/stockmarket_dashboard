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
ADMIN_USERNAME=shubham
ADMIN_PASSWORD=use_a_fresh_strong_password
FLASK_SECRET_KEY=use_a_long_random_secret
OPENAI_API_KEY=optional_for_news_summaries
APIFY_TOKEN=optional_for_screener_financials
APIFY_SCREENER_ACTOR_ID=optional_actor_id_or_username/actor-name
PORT=5000
```

The same callback URL must be registered in your Upstox developer app.

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

## 7. Daily token refresh

When the Upstox token expires, open:

```text
https://your-domain.com/admin
```

Login as admin, click **Login with Upstox**, complete OTP/TOTP on Upstox, and the backend will save the new token.

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
