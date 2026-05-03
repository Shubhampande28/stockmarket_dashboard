const viewLabels = {
    movers: "Top 10 gainers and losers",
    all: "All stocks",
    gainers: "Top gainers",
    losers: "Top losers",
    it: "IT",
    bank: "Banking",
    finance: "Finance",
    auto: "Auto",
    pharma: "Pharma",
    fmcg: "FMCG",
    metal: "Metal",
    energy: "Energy",
    cement: "Cement",
    consumer: "Consumer",
    infra: "Infrastructure",
    others: "Others"
};

let currentView = "movers";
let fullData = {};
let searchTerm = "";
let resizeTimer;
let activeStatementType = "news";
let activeFinancials = null;
let activeStock = null;
let standaloneStockRendered = false;
let tradingViewScriptPromise = null;
const API_BASE = "";

const statementLabels = {
    profitLoss: "P&L",
    balanceSheet: "Balance Sheet",
    cashFlow: "Cash Flow"
};

const statementDescriptions = {
    profitLoss: "Track revenue, margins and profit trends across annual periods.",
    balanceSheet: "Review assets, liabilities and capital structure over time.",
    cashFlow: "Follow operating, investing and financing cash movement year by year."
};

const heatmap = document.getElementById("heatmap");
const message = document.getElementById("message");
const marketStatus = document.getElementById("marketStatus");
const lastFetched = document.getElementById("lastFetched");
const stockCount = document.getElementById("stockCount");
const gainerCount = document.getElementById("gainerCount");
const loserCount = document.getElementById("loserCount");
const avgChange = document.getElementById("avgChange");
const viewTitle = document.getElementById("viewTitle");
const viewMeta = document.getElementById("viewMeta");
const searchInput = document.getElementById("stockSearch");
const viewSelect = document.getElementById("viewSelect");
const filterButton = document.getElementById("filterButton");
const filterDrawer = document.getElementById("filterDrawer");
const drawerStockSearch = document.getElementById("drawerStockSearch");
const refreshButton = document.getElementById("refreshButton");
const statementModal = document.getElementById("statementModal");
const modalPanel = document.querySelector(".modal-panel");
const statementTitle = document.getElementById("statementTitle");
const statementMeta = document.getElementById("statementMeta");
const statementSource = document.getElementById("statementSource");
const statementSourceNote = document.getElementById("statementSourceNote");
const stockSnapshot = document.getElementById("stockSnapshot");
const newsPanel = document.getElementById("newsPanel");
const newsMeta = document.getElementById("newsMeta");
const newsList = document.getElementById("newsList");
const chartPanel = document.getElementById("chartPanel");
const chartMeta = document.getElementById("chartMeta");
const priceChart = document.getElementById("priceChart");
const infoPanel = document.getElementById("infoPanel");
const infoMeta = document.getElementById("infoMeta");
const stockInfo = document.getElementById("stockInfo");
const financialPanel = document.getElementById("financialPanel");
const financialTitle = document.getElementById("financialTitle");
const financialMeta = document.getElementById("financialMeta");
const statementMessage = document.getElementById("statementMessage");
const statementContent = document.getElementById("statementContent");

async function loadHeatmap() {
    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/stocks`);

        if (!res.ok) {
            throw new Error("Unable to reach market service.");
        }

        const data = await res.json();

        if (data.error === "TOKEN_EXPIRED") {
            throw new Error("Market token expired. Admin must refresh the Upstox token.");
        }

        fullData = normalizePayload(data);
        updateSummary();
        renderGrid();
        setStatus("ready", "Live data loaded");
        setLastFetched();
        openRequestedStockDetail();
    } catch (error) {
        fullData = {};
        renderGrid();
        showMessage(error.message || "Something went wrong while loading market data.", "error");
        setStatus("error", "Offline");
    } finally {
        setLoading(false);
    }
}

function normalizePayload(data) {
    return Object.keys(viewLabels).reduce((payload, key) => {
        payload[key] = Array.isArray(data[key]) ? data[key] : [];
        return payload;
    }, {});
}

function setLoading(isLoading) {
    refreshButton.disabled = isLoading;

    if (isLoading) {
        showMessage("Loading market data...", "loading");
        setStatus("", "Connecting");
    }
}

function setStatus(state, label) {
    marketStatus.className = `market-status ${state}`;
    marketStatus.querySelector("span:last-child").textContent = label;
}

function setLastFetched(date = new Date()) {
    if (!lastFetched) {
        return;
    }

    lastFetched.textContent = date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message visible ${type}`;
}

function hideMessage() {
    message.className = "message";
}

function updateSummary() {
    if (!stockCount || !gainerCount || !loserCount || !avgChange) {
        return;
    }

    const stocks = fullData.all || [];
    const gainers = stocks.filter(stock => stock.change > 0);
    const losers = stocks.filter(stock => stock.change < 0);
    const average = stocks.length
        ? stocks.reduce((total, stock) => total + Number(stock.change || 0), 0) / stocks.length
        : 0;

    stockCount.textContent = stocks.length || "--";
    gainerCount.textContent = gainers.length || "--";
    loserCount.textContent = losers.length || "--";
    avgChange.textContent = stocks.length ? formatChange(average) : "--";
}

function loadView(type) {
    currentView = type;
    const sectorViews = ["it", "bank", "finance", "auto", "pharma", "fmcg", "metal", "energy", "cement", "consumer", "infra"];
    const sectorTrigger = document.querySelector(".sector-trigger");

    if (heatmap) {
        heatmap.classList.add("is-switching");
    }

    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.toggle("active", button.dataset.view === type);
    });
    if (sectorTrigger) {
        const isSectorView = sectorViews.includes(type);
        sectorTrigger.classList.toggle("active", isSectorView);
        sectorTrigger.textContent = isSectorView ? viewLabels[type] : "Sectors";
        sectorTrigger.setAttribute("aria-expanded", "false");
        sectorTrigger.closest(".sector-menu")?.classList.remove("open");
    }
    document.querySelectorAll("[data-drawer-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.drawerView === type);
    });
    if (viewSelect) {
        viewSelect.value = type;
    }
    renderGrid();

    if (heatmap) {
        requestAnimationFrame(() => heatmap.classList.remove("is-switching"));
    }
}

function getTileColorBase(change, intensity = 0.3) {
    const value = Number(change) || 0;
    const strength = Math.min(Math.max(Math.abs(value) / 4, intensity * 0.72), 1);

    if (value > 0) {
        const lightness = 37 - strength * 11;
        return `linear-gradient(135deg, hsl(151 64% ${lightness}%), hsl(151 72% ${lightness - 4}%))`;
    }

    if (value < 0) {
        const lightness = 46 - strength * 12;
        return `linear-gradient(135deg, hsl(355 72% ${lightness}%), hsl(355 78% ${lightness - 5}%))`;
    }

    return "linear-gradient(135deg, #64748b, #475569)";

    const val = Math.min(Math.abs(change), 5); // cap at 5%

    if (change > 0) {
        // 🟢 green shades
        if (val > 3) return "#065f46";   // dark green
        if (val > 2) return "#047857";
        if (val > 1) return "#059669";
        if (val > 0.5) return "#10b981";
        return "#6ee7b7";               // light green
    } else if (change < 0) {
        // 🔴 red shades
        if (val > 3) return "#7f1d1d";   // dark red
        if (val > 2) return "#991b1b";
        if (val > 1) return "#b91c1c";
        if (val > 0.5) return "#dc2626";
        return "#f87171";               // light red
    } else {
        return "#1f2937"; // neutral
    }
}

function getMovementStyleBase(intensity, index) {
    const pulseDuration = 5.8 - intensity * 1.4;
    const pulseGlow = 0.12 + intensity * 0.28;
    const pulseDelay = -(index % 10) * 0.22;

    return {
        bloomScale: (1.01 + intensity * 0.025).toFixed(3),
        pulseDuration: `${Math.max(pulseDuration, 3.8).toFixed(2)}s`,
        pulseGlow: pulseGlow.toFixed(2),
        pulseDelay: `${pulseDelay.toFixed(2)}s`
    };
}

function getMosaicStyle(stock, intensity) {
    if (window.innerWidth <= 420) {
        return {
            spanX: intensity > 0.72 ? 2 : 1,
            spanY: intensity > 0.72 ? 2 : 1,
            textBoost: "0px"
        };
    }

    if (window.innerWidth <= 640) {
        return {
            spanX: intensity > 0.72 ? 2 : 1,
            spanY: intensity > 0.72 ? 2 : 1,
            textBoost: "0px"
        };
    }

    if (window.innerWidth <= 900) {
        return {
            spanX: intensity > 0.8 ? 6 : intensity > 0.45 ? 4 : 3,
            spanY: intensity > 0.8 ? 4 : 3,
            textBoost: `${(intensity * 3).toFixed(1)}px`
        };
    }

    const spanX = intensity > 0.85 ? 6 : intensity > 0.65 ? 5 : intensity > 0.38 ? 4 : 3;
    const spanY = intensity > 0.85 ? 4 : intensity > 0.65 ? 4 : 3;
    const textBoost = intensity * 5;

    return {
        spanX,
        spanY,
        textBoost: `${textBoost.toFixed(1)}px`
    };
}

function getMovementClass(change) {
    if (change > 0) {
        return "positive";
    }

    if (change < 0) {
        return "negative";
    }

    return "neutral";
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getFilteredStocks() {
    const stocks = [...(fullData[currentView] || [])];
    let sortedStocks = sortStocksForView(stocks);

    if (searchTerm) {
        sortedStocks = sortedStocks.filter(stock => {
            const symbol = stock.symbol.toLowerCase();
            const name = (stock.name || "").toLowerCase();
            return symbol.includes(searchTerm) || name.includes(searchTerm);
        });
    }

    // 👇 Yahan shuffle kar do (display ke just pehle)
    return shuffleArray(sortedStocks.slice(0, 100));
}

function sortStocksForView(stocks) {
    if (currentView === "gainers") {
        return stocks.sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
    }

    if (currentView === "losers") {
        return stocks.sort((a, b) => Number(a.change || 0) - Number(b.change || 0));
    }

    if (currentView === "movers") {
        return [...getRankedGainers(stocks), ...getRankedLosers(stocks)];
    }

    return [...getRankedGainers(stocks), ...getRankedLosers(stocks)];
}

function getRankedGainers(stocks) {
    return stocks
        .filter(stock => Number(stock.change || 0) >= 0)
        .sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
}

function getRankedLosers(stocks) {
    return stocks
        .filter(stock => Number(stock.change || 0) < 0)
        .sort((a, b) => Number(a.change || 0) - Number(b.change || 0));
}

function renderGrid() {
    const stocks = getFilteredStocks();

    heatmap.innerHTML = "";
    heatmap.className = "stock-card-grid";
    viewTitle.textContent = viewLabels[currentView];
    viewMeta.textContent = `${stocks.length} ${stocks.length === 1 ? "stock" : "stocks"} shown`;

    if (!stocks.length) {
        if (Object.keys(fullData).length) {
            showMessage("No stocks match this view or search.", "");
        }
        return;
    }

    hideMessage();

    stocks.forEach((stock, index) => {
        heatmap.appendChild(createStockCard(stock, index));
    });
}

function createStockCard(stock, index) {
    const card = document.createElement("article");
    const isPositive = Number(stock.change || 0) >= 0;
    const symbol = stock.symbol.replace(".NS", "");
    const cardSize = getCardSize(index);
    const insight = getStockInsight(stock);
    const trendDirection = isPositive ? "↑ Uptrend" : "↓ Downtrend";

    card.className = `stock-card ${isPositive ? "positive" : "negative"} ${cardSize}`;
    card.tabIndex = 0;
    card.role = "button";
    card.dataset.symbol = stock.symbol;
    card.style.setProperty("--mount-delay", `${Math.min(index, 18) * 38}ms`);
    card.setAttribute("aria-label", `Open ${stock.name || symbol} stock details`);
    card.title = `${symbol}: ${formatPrice(stock.price)} (${formatChange(stock.change)})`;

    card.innerHTML = `
        <div class="stock-card-header">
            <span class="stock-card-name">${escapeHtml(stock.name || symbol)}</span>
            <span class="stock-card-rank">#${index + 1}</span>
        </div>
        <div class="stock-card-price-row">
            <strong>₹${formatPrice(stock.price)}</strong>
            <span class="stock-card-change ${isPositive ? "gain" : "loss"}">
                ${formatChange(stock.change)}
            </span>
        </div>
        <div class="stock-card-insight-block">
            <span>${isPositive ? "🔥" : "⚠"} ${escapeHtml(insight)}</span>
            <strong class="${isPositive ? "gain" : "loss"}">${trendDirection}</strong>
        </div>
        <div class="stock-card-metrics">
            <span>PE: --</span>
            <span>ROE: --</span>
        </div>
    `;

    return card;
}

function getCardSize(index) {
    const isMobile = window.innerWidth <= 640;

    if (isMobile) {
        return index === 0 ? "large" : "small";
    }

    if (index === 0) {
        return "large";
    }

    if (index < 4) {
        return "medium";
    }

    return "small";
}

function getStockInsight(stock) {
    const change = Number(stock.change || 0);

    if (change >= 3) {
        return "Strong Momentum";
    }
    if (change > 0) {
        return "Positive Trend";
    }
    if (change <= -3) {
        return "High Pressure";
    }
    if (change < 0) {
        return "Weak Trend";
    }
    return "Watchlist";
}

function isPhoneViewport() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const narrowViewport = window.innerWidth <= 760;
    const narrowScreen = Math.min(window.screen.width || window.innerWidth, window.screen.height || window.innerHeight) <= 760;
    return narrowViewport || (coarsePointer && narrowScreen);
}

function renderPhoneGrid(stocks, intensityMap) {
    stocks.forEach((stock, index) => {
        const intensity = intensityMap.get(getStockKey(stock, index)) || 0.25;
        const tile = document.createElement("article");
        const featured = intensity > 0.76;

        tile.className = `mobile-tile ${featured ? "featured" : ""} ${getMovementClass(stock.change)}`;
        tile.tabIndex = 0;
        tile.role = "button";
        tile.dataset.symbol = stock.symbol;
        tile.setAttribute("aria-label", `Open financial statements for ${stock.name || stock.symbol}`);
        tile.style.background = getColor(stock.change, intensity);
        tile.title = `${stock.symbol}: ${formatPrice(stock.price)} (${formatChange(stock.change)})`;

        tile.innerHTML = `
            <div class="mobile-tile-head">
                <div class="mobile-tile-identity">
                    <strong>${escapeHtml(stock.name || stock.symbol.replace(".NS", ""))}</strong>
                    <small>${escapeHtml(stock.symbol.replace(".NS", ""))}</small>
                </div>
                <span class="mobile-change-badge">
                    <strong>${formatChange(stock.change)}</strong>
                    <small>${formatNetChange(stock.netChange)}</small>
                </span>
            </div>
            <div class="mobile-tile-body">
                <div class="mobile-tile-price">
                    <span>LTP</span>
                    <strong>${formatPrice(stock.price)}</strong>
                </div>
            </div>
        `;

        heatmap.appendChild(tile);
    });
}

async function openFinancialStatements(stock) {
    activeStatementType = "news";
    activeFinancials = null;
    activeStock = stock;
    statementTitle.textContent = `${stock.symbol.replace(".NS", "")} - ${stock.name || stock.symbol}`;
    statementMeta.textContent = "Annual figures";
    statementSource.textContent = "";
    statementSourceNote.textContent = "";
    renderStockSnapshot(stock);
    renderNewsLoading();
    setStatementTabs();
    showStatementMessage("Loading statements...");
    statementContent.innerHTML = "";
    statementModal.hidden = false;
    if (isStockDetailPage()) {
        document.body.classList.add("stock-detail-page");
        document.title = `${stock.symbol.replace(".NS", "")} - Stock details`;
    } else {
        document.body.classList.add("modal-open");
    }
    renderPriceChart(stock);
    renderStockInfo(stock);

    loadFinancialStatements(stock);
    loadStockNews(stock);
}

function renderStockSnapshot(stock) {
    stockSnapshot.innerHTML = `
        <div class="snapshot-main">
            <span class="snapshot-symbol">${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
            <strong>${formatPrice(stock.price)}</strong>
            <span class="snapshot-change ${stock.change >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</span>
        </div>
        <div class="snapshot-metrics">
            <span>Open <strong>${formatCompactPrice(stock.open)}</strong></span>
            <span>High <strong>${formatCompactPrice(stock.high)}</strong></span>
            <span>Low <strong>${formatCompactPrice(stock.low)}</strong></span>
            <span>Close <strong>${formatCompactPrice(stock.close)}</strong></span>
        </div>
    `;
}

function renderStockSnapshotWithFinancials(stock, data) {
    const valuation = data.valuation || {};
    const range = valuation.fiftyTwoWeekLow && valuation.fiftyTwoWeekHigh
        ? `${formatCompactPrice(valuation.fiftyTwoWeekLow)} - ${formatCompactPrice(valuation.fiftyTwoWeekHigh)}`
        : "--";
    const quoteSource = valuation.source;
    const quoteSourceHtml = quoteSource?.url
        ? `<a href="${escapeAttribute(quoteSource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(quoteSource.provider || "Yahoo Finance quote summary")}</a>`
        : "--";
    const statementSourceHtml = data.source?.url
        ? `<a href="${escapeAttribute(data.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml([data.source.provider, data.source.label].filter(Boolean).join(" - "))}</a>`
        : escapeHtml([data.source?.provider, data.source?.label].filter(Boolean).join(" - ") || "Statement source unavailable");
    const filing = data.source?.annualReport;
    const filingHtml = filing?.url
        ? `<strong>Official filing: <a href="${escapeAttribute(filing.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml([filing.provider, filing.year].filter(Boolean).join(" - ") || "NSE annual report")}</a></strong>`
        : "";

    stockSnapshot.innerHTML = `
        <div class="snapshot-main">
            <span class="snapshot-symbol">${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
            <strong>${formatPrice(stock.price)}</strong>
            <span class="snapshot-change ${stock.change >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</span>
        </div>
        <div class="snapshot-metrics">
            <span>Open <strong>${formatCompactPrice(stock.open)}</strong></span>
            <span>High <strong>${formatCompactPrice(stock.high)}</strong></span>
            <span>Low <strong>${formatCompactPrice(stock.low)}</strong></span>
            <span>Close <strong>${formatCompactPrice(stock.close)}</strong></span>
            <span>Market cap <strong>${formatMarketCap(valuation.marketCap)}</strong></span>
            <span>Trailing P/E <strong>${formatRatio(valuation.peTrailing)}</strong></span>
            <span>Forward P/E <strong>${formatRatio(valuation.peForward)}</strong></span>
            <span>52W range <strong>${range}</strong></span>
        </div>
        <div class="snapshot-source">
            <span>Data sources</span>
            <strong>Live price: Upstox market quote</strong>
            <strong>Valuation: ${quoteSourceHtml}</strong>
            <strong>P&L, Balance Sheet, Cash Flow: ${statementSourceHtml}</strong>
            ${filingHtml}
        </div>
    `;
}

async function loadFinancialStatements(stock) {
    try {
        const res = await fetch(`${API_BASE}/financials/${encodeURIComponent(stock.symbol)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || "Unable to load financial statements.");
        }

        activeFinancials = data;
        statementTitle.textContent = `${data.symbol.replace(".NS", "")} - ${data.name}`;
        statementMeta.textContent = `${data.currency || "INR"} annual figures`;
        renderStockSnapshotWithFinancials(stock, data);
        renderStockInfo(stock, data);
        renderStatementSource(data.source);
        statementSourceNote.textContent = data.sourceNote || "";
        renderActiveStatement();
    } catch (error) {
        showStatementMessage(error.message || "Unable to load financial statements.", "error");
    }
}

async function loadStockNews(stock) {
    try {
        const res = await fetch(`${API_BASE}/news/${encodeURIComponent(stock.symbol)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || "Unable to load stock news.");
        }

        renderNews(data.items || []);
    } catch (error) {
        newsMeta.textContent = error.message || "Unable to load stock news.";
        newsList.innerHTML = "";
    }
}

function renderNewsLoading() {
    newsMeta.textContent = "Loading news links and summaries";
    newsList.innerHTML = `
        <article class="news-card neutral">
            <div class="news-summary">Fetching latest headlines...</div>
        </article>
    `;
}

function renderNews(items) {
    newsMeta.textContent = items.length
        ? `${items.length} links with cached summaries`
        : "No recent news found";

    newsList.innerHTML = items.map(item => `
        <article class="news-card ${escapeHtml(item.sentiment || "neutral")}">
            <div class="news-card-top">
                <span>${escapeHtml(item.publisher || "News")}</span>
                <strong>${escapeHtml(item.sentiment || "neutral")}</strong>
            </div>
            <a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
            <p class="news-summary">${escapeHtml(item.summary || item.title)}</p>
        </article>
    `).join("");
}

function renderPriceChart(stock) {
    if (!priceChart || !chartMeta) {
        return;
    }

    if (!stock) {
        chartMeta.textContent = "Select a stock to view the price chart";
        priceChart.innerHTML = `<div class="chart-empty">No price data available.</div>`;
        return;
    }

    const cleanSymbol = stock.symbol.replace(".NS", "");
    const tvSymbol = `NSE:${cleanSymbol}`;
    const containerId = `tradingview-${cleanSymbol.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    chartMeta.textContent = `${cleanSymbol} TradingView price chart`;
    priceChart.innerHTML = `
        <div class="tradingview-chart-shell">
            <div id="${escapeAttribute(containerId)}" class="tradingview-chart"></div>
        </div>
        <p class="chart-source-note">Chart source: TradingView symbol <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tvSymbol)}</a>.</p>
    `;
    loadTradingViewChart(tvSymbol, containerId);
    return;

    const points = [
        { label: "Open", value: toFiniteNumber(stock.open) },
        { label: "High", value: toFiniteNumber(stock.high) },
        { label: "Low", value: toFiniteNumber(stock.low) },
        { label: "Close", value: toFiniteNumber(stock.close) },
        { label: "LTP", value: toFiniteNumber(stock.price) }
    ].filter(point => point.value !== null);

    if (points.length < 2) {
        chartMeta.textContent = "Price chart unavailable";
        priceChart.innerHTML = `<div class="chart-empty">Open, high, low, close data is not available.</div>`;
        return;
    }

    const values = points.map(point => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.16, Math.abs(maxValue) * 0.004, 1);
    const chartMin = minValue - padding;
    const chartMax = maxValue + padding;
    const valueRange = chartMax - chartMin || 1;
    const isGain = Number(stock.change || 0) >= 0;
    const polyline = points.map((point, index) => {
        const x = 42 + index * (416 / Math.max(points.length - 1, 1));
        const y = 26 + ((chartMax - point.value) / valueRange) * 176;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const areaLine = `42,220 ${polyline} 458,220`;
    const markerHtml = points.map((point, index) => {
        const x = 42 + index * (416 / Math.max(points.length - 1, 1));
        const y = 26 + ((chartMax - point.value) / valueRange) * 176;
        return `
            <g class="chart-marker">
                <line x1="${x.toFixed(1)}" y1="210" x2="${x.toFixed(1)}" y2="218"></line>
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5"></circle>
            </g>
        `;
    }).join("");
    const pointCards = points.map(point => `
        <span>
            ${escapeHtml(point.label)}
            <strong>${formatCompactPrice(point.value)}</strong>
        </span>
    `).join("");

    chartMeta.textContent = `${stock.symbol.replace(".NS", "")} intraday OHLC snapshot`;
    priceChart.innerHTML = `
        <div class="chart-visual ${isGain ? "gain" : "loss"}">
            <svg viewBox="0 0 500 240" role="img" aria-label="Price chart for ${escapeAttribute(stock.name || stock.symbol)}">
                <defs>
                    <linearGradient id="priceAreaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="currentColor" stop-opacity="0.24"></stop>
                        <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
                    </linearGradient>
                </defs>
                <g class="chart-grid">
                    <line x1="42" y1="34" x2="458" y2="34"></line>
                    <line x1="42" y1="94" x2="458" y2="94"></line>
                    <line x1="42" y1="154" x2="458" y2="154"></line>
                    <line x1="42" y1="214" x2="458" y2="214"></line>
                </g>
                <text x="42" y="22" class="chart-scale">${formatCompactPrice(chartMax)}</text>
                <text x="42" y="232" class="chart-scale">${formatCompactPrice(chartMin)}</text>
                <polygon class="chart-area" points="${areaLine}"></polygon>
                <polyline class="chart-line" points="${polyline}"></polyline>
                ${markerHtml}
            </svg>
        </div>
        <div class="chart-points">${pointCards}</div>
    `;
}

function openChartPage(stock) {
    if (!stock) {
        return;
    }

    activeStatementType = "chart";
    renderActiveStatement();
}

function loadTradingViewChart(symbol, containerId) {
    const renderWidget = () => {
        const container = document.getElementById(containerId);
        if (!container || !window.TradingView) {
            return;
        }

        container.innerHTML = "";
        new window.TradingView.widget({
            autosize: true,
            symbol,
            interval: "15",
            timezone: "Asia/Kolkata",
            theme: "light",
            style: "1",
            locale: "in",
            toolbar_bg: "#ffffff",
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: containerId
        });
    };

    if (window.TradingView) {
        renderWidget();
        return;
    }

    if (!tradingViewScriptPromise) {
        tradingViewScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://s3.tradingview.com/tv.js";
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    tradingViewScriptPromise.then(renderWidget).catch(() => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="chart-empty">Unable to load TradingView chart.</div>`;
        }
    });
}

function openStockPage(stock) {
    if (!stock) {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("stock", stock.symbol);
    window.open(url.toString(), "_blank");
}

function renderStockInfo(stock, data = activeFinancials) {
    if (!stockInfo || !infoMeta) {
        return;
    }

    if (!stock) {
        infoMeta.textContent = "Select a stock to view company info";
        stockInfo.innerHTML = `<div class="info-empty">No stock info available.</div>`;
        return;
    }

    const valuation = data?.valuation || {};
    const info = data?.info || {};
    const rows = [
        ["Market Cap", parseInfoDisplay(info.marketCap || formatMarketCap(valuation.marketCap), "₹", "Cr")],
        ["Current Price", parseInfoDisplay(info.currentPrice || formatCurrencyValue(stock.price), "₹", "")],
        ["High / Low", parseInfoDisplay(info.highLow || formatHighLow(valuation.fiftyTwoWeekHigh || stock.high, valuation.fiftyTwoWeekLow || stock.low), "₹", "")],
        ["Stock P/E", parseInfoDisplay(info.stockPe || formatRatio(valuation.peTrailing), "", "x")],
        ["Book Value", parseInfoDisplay(info.bookValue || formatCurrencyValue(valuation.bookValue), "₹", "")],
        ["Dividend Yield", parseInfoDisplay(info.dividendYield || formatPercentValue(valuation.dividendYield), "", "%")],
        ["ROCE", parseInfoDisplay(info.roce || formatPercentValue(valuation.roce), "", "%")],
        ["ROE", parseInfoDisplay(info.roe || formatPercentValue(valuation.roe), "", "%")],
        ["Face Value", parseInfoDisplay(info.faceValue || formatCurrencyValue(valuation.faceValue), "₹", "")]
    ];

    infoMeta.textContent = `${stock.symbol.replace(".NS", "")} market and valuation snapshot`;
    stockInfo.innerHTML = rows.map(([label, display]) => `
        <div class="stock-info-row">
            <span>${escapeHtml(label)}</span>
            <strong>
                ${display.prefix ? `<small>${escapeHtml(display.prefix)}</small>` : ""}
                <span>${escapeHtml(display.value)}</span>
                ${display.unit ? `<small>${escapeHtml(display.unit)}</small>` : ""}
            </strong>
        </div>
    `).join("");
}

function parseInfoDisplay(rawValue, fallbackPrefix = "", fallbackUnit = "") {
    const text = String(rawValue || "--")
        .replace(/₹/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!text || text === "--") {
        return { prefix: "", value: "--", unit: "" };
    }

    let value = text
        .replace(/\bCr\.?\b/gi, "")
        .replace(/%/g, "")
        .trim();
    let unit = fallbackUnit;

    if (/cr\.?/i.test(text)) {
        unit = "Cr";
    } else if (/%/.test(text)) {
        unit = "%";
    }

    if (unit === "%" || unit === "x") {
        return { prefix: "", value, unit };
    }

    return { prefix: fallbackPrefix, value, unit };
}

function toFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function closeFinancialStatements() {
    if (isStockDetailPage()) {
        window.close();
        window.location.href = window.location.pathname;
        return;
    }

    statementModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function getRequestedStockSymbol() {
    return new URLSearchParams(window.location.search).get("stock");
}

function isStockDetailPage() {
    return Boolean(getRequestedStockSymbol());
}

function prepareStockDetailPage() {
    if (isStockDetailPage()) {
        document.body.classList.add("stock-detail-page");
    }
}

function openRequestedStockDetail() {
    const requestedSymbol = getRequestedStockSymbol();
    if (!requestedSymbol || standaloneStockRendered) {
        return;
    }

    const normalizedSymbol = requestedSymbol.toUpperCase();
    const stock = Object.values(fullData)
        .flat()
        .find(item => item.symbol.toUpperCase() === normalizedSymbol || item.symbol.replace(".NS", "").toUpperCase() === normalizedSymbol.replace(".NS", ""));

    if (!stock) {
        showMessage(`Unable to find ${requestedSymbol}.`, "error");
        return;
    }

    standaloneStockRendered = true;
    openFinancialStatements(stock);
}

function setStatementTabs() {
    document.querySelectorAll(".statement-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.statement === activeStatementType);
    });
    newsPanel.classList.toggle("active", activeStatementType === "news");
    infoPanel.classList.toggle("active", activeStatementType === "info");
    chartPanel.classList.toggle("active", activeStatementType === "chart");
    financialPanel.classList.toggle(
        "active",
        activeStatementType !== "news" && activeStatementType !== "info" && activeStatementType !== "chart"
    );
}

function renderActiveStatement() {
    setStatementTabs();

    if (activeStatementType === "news") {
        statementMessage.className = "statement-message";
        statementContent.innerHTML = "";
        return;
    }

    if (activeStatementType === "chart") {
        statementMessage.className = "statement-message";
        statementContent.innerHTML = "";
        renderPriceChart(activeStock);
        return;
    }

    if (activeStatementType === "info") {
        statementMessage.className = "statement-message";
        statementContent.innerHTML = "";
        renderStockInfo(activeStock);
        return;
    }

    const statement = activeFinancials?.statements?.[activeStatementType];

    if (!statement || !statement.rows.length) {
        showStatementMessage(`${statementLabels[activeStatementType]} data is not available.`, "error");
        statementContent.innerHTML = "";
        return;
    }

    if (financialTitle && financialMeta) {
        financialTitle.textContent = statementLabels[activeStatementType] || "Financial statement";
        financialMeta.textContent = statementDescriptions[activeStatementType] || "Review annual statement trends across years.";
    }

    statementMessage.className = "statement-message";
    statementMessage.textContent = "";
    statementContent.innerHTML = `
        <div class="statement-table-wrap">
            <table class="statement-table">
                <thead>
                    <tr>
                        <th scope="col">Metric</th>
                        ${statement.periods.map(period => `<th scope="col">${escapeHtml(period)}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${statement.rows.map(row => `
                        <tr>
                            <th scope="row">${escapeHtml(row.label)}</th>
                            ${row.values.map(value => `<td>${formatFinancialValue(value)}</td>`).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function enableStatementTableTouchPan() {
    let dragState = null;
    const dragThreshold = 6;

    statementContent.addEventListener("pointerdown", event => {
        const tableWrap = event.target.closest(".statement-table-wrap");
        if (!tableWrap || event.pointerType === "mouse") {
            return;
        }

        dragState = {
            tableWrap,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: tableWrap.scrollLeft,
            scrollTop: modalPanel.scrollTop,
            active: false
        };

        tableWrap.setPointerCapture(event.pointerId);
    });

    statementContent.addEventListener("pointermove", event => {
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        if (!dragState.active && Math.hypot(dx, dy) < dragThreshold) {
            return;
        }

        dragState.active = true;
        dragState.tableWrap.scrollLeft = dragState.scrollLeft - dx;
        modalPanel.scrollTop = dragState.scrollTop - dy;
        event.preventDefault();
    });

    const clearDragState = event => {
        if (dragState && event.pointerId === dragState.pointerId) {
            dragState = null;
        }
    };

    statementContent.addEventListener("pointerup", clearDragState);
    statementContent.addEventListener("pointercancel", clearDragState);
}

function renderStatementSource(source) {
    if (!source) {
        statementSource.textContent = "";
        return;
    }

    const sourceParts = [source.provider, source.label].filter(Boolean);
    const report = source.annualReport;
    const label = sourceParts.join(" - ");
    if (source.url) {
        const reportLink = report?.url
            ? ` · Filing: <a href="${escapeAttribute(report.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml([report.provider, report.year].filter(Boolean).join(" - ") || "NSE annual report")}</a>`
            : "";
        statementSource.innerHTML = `Source: <a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>${reportLink}`;
        return;
    }

    statementSource.textContent = `Source: ${label}`;
}

function showStatementMessage(text, type = "") {
    statementMessage.textContent = text;
    statementMessage.className = `statement-message visible ${type}`;
}

function getStockBySymbol(symbol) {
    return Object.values(fullData)
        .flat()
        .find(stock => stock.symbol === symbol);
}

function getRankIntensityMap(stocks) {
    const intensityMap = new Map();
    addRankIntensities(intensityMap, getRankedGainers(stocks), stocks);
    addRankIntensities(intensityMap, getRankedLosers(stocks), stocks);

    return intensityMap;
}

function addRankIntensities(intensityMap, rankedStocks, visibleStocks) {
    const lastIndex = Math.max(rankedStocks.length - 1, 1);

    rankedStocks.forEach((stock, rank) => {
        const visibleIndex = visibleStocks.indexOf(stock);
        const rankPosition = rank / lastIndex;
        const intensity = 1 - rankPosition * 0.72;
        intensityMap.set(getStockKey(stock, visibleIndex), Math.max(intensity, 0.28));
    });
}

function getStockKey(stock, index) {
    return `${stock.symbol}-${index}`;
}

function getGridLayout() {
    const styles = window.getComputedStyle(heatmap);
    const columns = styles.gridTemplateColumns.split(" ").filter(Boolean).length || 16;
    const rowHeight = Number.parseFloat(styles.gridAutoRows) || 92;
    const columnWidth = heatmap.clientWidth / columns;

    return { columnWidth, rowHeight };
}

function getGrowthSpaceBase(mosaic, bloomScale, layout) {
    return "0px";

    const scale = Number(bloomScale) || 1;
    const width = mosaic.spanX * layout.columnWidth;
    const height = mosaic.spanY * layout.rowHeight;
    const largestSide = Math.max(width, height);
    const reserve = ((scale - 1) * largestSide) / (2 * scale);

    return `${Math.ceil(reserve + 6)}px`;
}

function formatPrice(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatCompactPrice(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatNetChange(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}`;
}

function formatChange(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
}

function formatFinancialValue(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHtml(String(value));
    }

    const absNumber = Math.abs(number);
    if (absNumber >= 10000000) {
        return `${(number / 10000000).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatRatio(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHtml(String(value));
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatMarketCap(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHtml(String(value));
    }

    if (Math.abs(number) >= 10000000) {
        return `${(number / 10000000).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
}

function formatCurrencyValue(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return String(value);
    }

    return `₹ ${number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
}

function formatHighLow(high, low) {
    const highText = formatCurrencyValue(high);
    const lowText = formatCurrencyValue(low);
    if (highText === "--" && lowText === "--") {
        return "--";
    }
    return `${highText} / ${lowText}`;
}

function formatPercentValue(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return String(value);
    }

    const percent = Math.abs(number) <= 1 ? number * 100 : number;
    return `${percent.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })} %`;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}

function getColor(change, intensity = 0.3) {
    const value = Number(change) || 0;
    const strength = Math.min(Math.max(Math.abs(value) / 4, intensity * 0.72), 1);

    if (value > 0) {
        const lightness = 37 - strength * 11;
        return `linear-gradient(135deg, hsl(151 64% ${lightness}%), hsl(151 72% ${lightness - 4}%))`;
    }

    if (value < 0) {
        const lightness = 46 - strength * 12;
        return `linear-gradient(135deg, hsl(355 72% ${lightness}%), hsl(355 78% ${lightness - 5}%))`;
    }

    return "linear-gradient(135deg, #64748b, #475569)";
}

function getMovementStyle(intensity, index) {
    const bloomScale = 1.04 + intensity * 0.2;
    const pulseDuration = 4.6 - intensity * 1.2;
    const pulseGlow = 0.18 + intensity * 0.58;
    const pulseDelay = -(index % 8) * 0.18;

    return {
        bloomScale: bloomScale.toFixed(3),
        pulseDuration: `${Math.max(pulseDuration, 2.4).toFixed(2)}s`,
        pulseGlow: pulseGlow.toFixed(2),
        pulseDelay: `${pulseDelay.toFixed(2)}s`
    };
}

function getGrowthSpace(mosaic, bloomScale, layout) {
    const scale = Number(bloomScale) || 1;
    const width = mosaic.spanX * layout.columnWidth;
    const height = mosaic.spanY * layout.rowHeight;
    const largestSide = Math.max(width, height);
    const reserve = ((scale - 1) * largestSide) / (2 * scale);

    return `${Math.ceil(reserve + 6)}px`;
}

document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => loadView(button.dataset.view));
});

document.querySelectorAll(".sector-trigger").forEach(button => {
    button.addEventListener("click", event => {
        event.stopPropagation();
        const menu = button.closest(".sector-menu");
        const isOpen = menu?.classList.toggle("open");
        button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
});

document.addEventListener("click", event => {
    document.querySelectorAll(".sector-menu.open").forEach(menu => {
        if (menu.contains(event.target)) {
            return;
        }

        menu.classList.remove("open");
        menu.querySelector(".sector-trigger")?.setAttribute("aria-expanded", "false");
    });
});

if (viewSelect) {
    viewSelect.addEventListener("change", event => {
        loadView(event.target.value);
    });
}

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    if (drawerStockSearch && drawerStockSearch.value !== event.target.value) {
        drawerStockSearch.value = event.target.value;
    }
    renderGrid();
});

if (drawerStockSearch) {
    drawerStockSearch.addEventListener("input", event => {
        searchTerm = event.target.value.trim().toLowerCase();
        if (searchInput && searchInput.value !== event.target.value) {
            searchInput.value = event.target.value;
        }
        renderGrid();
    });
}

function openFilterDrawer() {
    if (!filterDrawer) {
        return;
    }
    filterDrawer.hidden = false;
    document.body.classList.add("filter-open");
}

function closeFilterDrawer() {
    if (!filterDrawer) {
        return;
    }
    filterDrawer.hidden = true;
    document.body.classList.remove("filter-open");
}

if (filterButton) {
    filterButton.addEventListener("click", openFilterDrawer);
}

document.querySelectorAll("[data-open-filters]").forEach(element => {
    element.addEventListener("click", event => {
        event.preventDefault();
        openFilterDrawer();
    });
});

document.querySelectorAll("[data-close-filters]").forEach(element => {
    element.addEventListener("click", closeFilterDrawer);
});

document.querySelectorAll("[data-drawer-view]").forEach(button => {
    button.addEventListener("click", () => {
        loadView(button.dataset.drawerView);
        closeFilterDrawer();
    });
});

refreshButton.addEventListener("click", loadHeatmap);
heatmap.addEventListener("click", event => {
    const tile = event.target.closest(".stock-card, .tile, .mobile-tile");
    if (!tile) {
        return;
    }

    const stock = getStockBySymbol(tile.dataset.symbol);
    if (stock) {
        openStockPage(stock);
    }
});

heatmap.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    const tile = event.target.closest(".stock-card, .tile, .mobile-tile");
    if (!tile) {
        return;
    }

    event.preventDefault();
    const stock = getStockBySymbol(tile.dataset.symbol);
    if (stock) {
        openStockPage(stock);
    }
});

document.querySelectorAll("[data-close-statements]").forEach(element => {
    element.addEventListener("click", closeFinancialStatements);
});

document.querySelectorAll(".statement-tab").forEach(button => {
    button.addEventListener("click", () => {
        activeStatementType = button.dataset.statement;
        if (activeFinancials || activeStatementType === "info" || activeStatementType === "chart") {
            renderActiveStatement();
        } else {
            setStatementTabs();
        }
    });
});

enableStatementTableTouchPan();

window.addEventListener("keydown", event => {
    if (event.key === "Escape" && !statementModal.hidden) {
        closeFinancialStatements();
    }
    if (event.key === "Escape" && filterDrawer && !filterDrawer.hidden) {
        closeFilterDrawer();
    }
});
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (Object.keys(fullData).length) {
            renderGrid();
        }
    }, 120);
});

window.addEventListener("load", () => {
    prepareStockDetailPage();
    loadHeatmap();
});
