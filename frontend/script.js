const viewLabels = {
    movers: "Top 10 gainers and losers",
    all: "All stocks",
    gainers: "Top gainers",
    losers: "Top losers",
    nifty50: "NIFTY 50 stocks",
    banknifty: "BANK NIFTY stocks",
    finnifty: "FIN NIFTY stocks",
    sensex: "SENSEX stocks",
    midcpnifty: "MIDCPNIFTY stocks",
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
let fullUniverse = [];
let indexQuotes = {};
let visibleStocks = [];
let searchTerm = "";
let resizeTimer;
let activeStatementType = "news";
let activeFinancials = null;
let activeStock = null;
let standaloneStockRendered = false;
let tradingViewScriptPromise = null;
const API_BASE = "";
const cardMetricCache = new Map();
const pendingCardMetricSymbols = new Set();
let cardMetricQueue = Promise.resolve();

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
const searchSuggestions = document.getElementById("searchSuggestions");
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
        const res = await fetch(`${API_BASE}/stocks`, { cache: "no-store" });

        if (!res.ok) {
            throw new Error("Unable to reach market service.");
        }

        const data = await res.json();

        if (data.error === "TOKEN_EXPIRED") {
            throw new Error("Market token expired. Admin must refresh the Upstox token.");
        }

        fullData = normalizePayload(data);
        indexQuotes = data.indexQuotes || {};
        fullUniverse = buildFullUniverse(fullData);
        updateIndexCards();
        updateSummary();
        renderGrid();
        setStatus("ready", "Live data loaded");
        setLastFetched();
        openRequestedStockDetail();
    } catch (error) {
        fullData = {};
        indexQuotes = {};
        updateIndexCards();
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

function buildFullUniverse(data) {
    const bySymbol = new Map();
    const preferred = [
        ...(data.all || []),
        ...Object.keys(viewLabels).flatMap(key => data[key] || [])
    ];

    preferred.forEach(stock => {
        if (!stock?.symbol || bySymbol.has(stock.symbol)) {
            return;
        }

        bySymbol.set(stock.symbol, stock);
    });

    return Array.from(bySymbol.values()).sort((a, b) => {
        const left = (a.name || a.symbol || "").localeCompare(b.name || b.symbol || "");
        return left || String(a.symbol).localeCompare(String(b.symbol));
    });
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

function updateIndexCards() {
    document.querySelectorAll("[data-index-view]").forEach(button => {
        const quote = indexQuotes[button.dataset.indexView] || {};
        const priceNode = button.querySelector("strong");
        const changeNode = button.querySelector("em");

        if (priceNode) {
            priceNode.textContent = quote.price === null || quote.price === undefined
                ? "--"
                : formatPrice(quote.price);
        }

        if (changeNode) {
            changeNode.textContent = quote.netChange === null || quote.netChange === undefined
                ? "Live quote unavailable"
                : `${formatNetChange(quote.netChange)} (${formatChange(quote.change)})`;
            changeNode.classList.toggle("gain", Number(quote.change || 0) >= 0 && quote.netChange !== undefined);
            changeNode.classList.toggle("loss", Number(quote.change || 0) < 0);
        }
    });
}

function loadView(type) {
    currentView = type;
    const sectorViews = ["it", "bank", "finance", "auto", "pharma", "fmcg", "metal", "energy", "cement", "consumer", "infra"];
    const sectorTrigger = document.querySelector(".sector-trigger");
    searchTerm = "";
    if (searchInput) {
        searchInput.value = "";
    }
    if (drawerStockSearch) {
        drawerStockSearch.value = "";
    }
    closeSearchSuggestions();

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
    document.querySelectorAll("[data-index-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.indexView === type);
        button.setAttribute("aria-pressed", button.dataset.indexView === type ? "true" : "false");
    });
    if (viewSelect && Array.from(viewSelect.options).some(option => option.value === type)) {
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
    const sourceStocks = searchTerm ? fullUniverse : (fullData[currentView] || []);
    const stocks = [...sourceStocks];
    let sortedStocks = sortStocksForView(stocks);

    if (searchTerm) {
        sortedStocks = sortedStocks.filter(stock => {
            const symbol = stock.symbol.toLowerCase();
            const name = (stock.name || "").toLowerCase();
            return symbol.includes(searchTerm) || name.includes(searchTerm);
        });
    }

    // ❌ REMOVE shuffle
    return sortedStocks.slice(0, 100);
}

function sortStocksForView(stocks) {
    if (searchTerm) {
        return stocks.sort((a, b) => {
            const aSymbol = a.symbol.replace(".NS", "").toLowerCase();
            const bSymbol = b.symbol.replace(".NS", "").toLowerCase();
            const aName = (a.name || "").toLowerCase();
            const bName = (b.name || "").toLowerCase();
            const aStarts = aSymbol.startsWith(searchTerm) || aName.startsWith(searchTerm);
            const bStarts = bSymbol.startsWith(searchTerm) || bName.startsWith(searchTerm);

            if (aStarts !== bStarts) {
                return aStarts ? -1 : 1;
            }

            return Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0));
        });
    }

    if (currentView === "losers") {
        return stocks.sort((a, b) => Number(a.change || 0) - Number(b.change || 0));
    }

    if (currentView === "movers") {
        return stocks.sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)));
    }

    return stocks.sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
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
    visibleStocks = stocks;

    heatmap.innerHTML = "";
    heatmap.className = "stock-card-grid";
    viewTitle.textContent = searchTerm ? "Search results" : viewLabels[currentView];
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
    hydrateVisibleCardMetrics(stocks);
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
    const intensity = getCardIntensity(stock.change);
    const tintOpacity = 0.04 + intensity * 0.08;
    const flowOpacity = 0.16 + intensity * 0.26;
    const shadowOpacity = 0.07 + intensity * 0.07;
    const positiveColor = getMovementAccent(stock.change, true);
    const negativeColor = getMovementAccent(stock.change, false);
    const movementColor = isPositive ? positiveColor : negativeColor;
    card.style.setProperty("--mount-delay", `${Math.min(index, 18) * 38}ms`);
    card.style.setProperty("--move-intensity", intensity.toFixed(2));
    card.style.setProperty("--card-shadow-y", `${(6 + intensity * 14).toFixed(1)}px`);
    card.style.setProperty("--card-shadow-blur", `${(14 + intensity * 22).toFixed(1)}px`);
    card.style.setProperty("--card-hover-y", `${(10 + intensity * 18).toFixed(1)}px`);
    card.style.setProperty("--card-hover-blur", `${(22 + intensity * 26).toFixed(1)}px`);
    card.style.setProperty("--card-overlay-opacity", (0.1 + intensity * 0.18).toFixed(2));
    card.style.setProperty("--card-border", movementColor);
    card.style.setProperty("--change-color", movementColor);
    card.style.setProperty("--change-opacity", (0.78 + intensity * 0.22).toFixed(2));
    card.style.setProperty("--card-tint", isPositive ? `rgba(22, 163, 74, ${tintOpacity.toFixed(3)})` : `rgba(220, 38, 38, ${tintOpacity.toFixed(3)})`);
    card.style.setProperty("--card-flow", isPositive ? `rgba(34, 197, 94, ${flowOpacity.toFixed(3)})` : `rgba(248, 113, 113, ${flowOpacity.toFixed(3)})`);
    card.style.setProperty("--card-direction-tint", isPositive ? `rgba(34, 197, 94, ${(tintOpacity * 1.1).toFixed(3)})` : `rgba(248, 113, 113, ${(tintOpacity * 1.1).toFixed(3)})`);
    card.style.setProperty("--card-shadow", isPositive ? `rgba(22, 163, 74, ${shadowOpacity.toFixed(3)})` : `rgba(220, 38, 38, ${shadowOpacity.toFixed(3)})`);
    card.setAttribute("aria-label", `Open ${stock.name || symbol} stock details`);
    card.title = `${symbol}: ${formatPrice(stock.price)} (${formatChange(stock.change)})`;

    card.innerHTML = `
        ${index === 0 ? `<div class="top-signal-label">${escapeHtml(getTopSignalLabel(stock))}</div>` : ""}
        <div class="stock-card-header">
            <span class="stock-card-name">${escapeHtml(symbol)}</span>
            <span class="stock-card-rank">#${index + 1}</span>
        </div>
        <div class="stock-card-price-row">
            <strong>₹${formatPrice(stock.price)}</strong>
            <span class="stock-card-change ${isPositive ? "gain" : "loss"}">
                ${formatChange(stock.change)}
            </span>
        </div>
        <div class="stock-card-insight-inline">
            <span class="insight-label">
                ${isPositive ? "🔥" : "⚠"} ${escapeHtml(insight)}
            </span>
            <span class="insight-trend ${isPositive ? "gain" : "loss"}">
                ${trendDirection}
            </span>
        </div>
        <div class="stock-card-metrics">
            <span>PE: <strong data-card-pe>${formatCardMetric(stock.pe)}</strong></span>
            <span>ROE: <strong data-card-roe>${formatCardMetric(stock.roe, "%")}</strong></span>
            <span>Open: <strong>${formatCompactPrice(stock.open)}</strong></span>
            <span>Close: <strong>${formatCompactPrice(stock.close)}</strong></span>
        </div>
    `;

    return card;
}

function getCardIntensity(change) {
    const value = Math.abs(Number(change) || 0);
    return Math.min(value / 10, 1);
}

function getMovementAccent(change, isPositive) {
    const intensity = getCardIntensity(change);
    if (isPositive) {
        const lightness = 46 - intensity * 12;
        return `hsl(142 72% ${lightness}%)`;
    }

    const lightness = 50 - intensity * 10;
    return `hsl(0 74% ${lightness}%)`;
}

function getTopSignalLabel(stock) {
    const direction = Number(stock.change || 0) >= 0 ? "Top upside signal" : "Top downside signal";
    return `${direction} · ${formatChange(stock.change)}`;
}

function hydrateVisibleCardMetrics(stocks) {
    stocks.slice(0, 24).forEach(stock => hydrateCardMetrics(stock.symbol));
}

function hydrateCardMetrics(symbol) {
    const baseSymbol = symbol.replace(".NS", "");

    if (!baseSymbol || pendingCardMetricSymbols.has(baseSymbol)) {
        return;
    }

    if (cardMetricCache.has(baseSymbol)) {
        applyCardMetrics(symbol, cardMetricCache.get(baseSymbol));
        return;
    }

    pendingCardMetricSymbols.add(baseSymbol);
    cardMetricQueue = cardMetricQueue
        .then(async () => {
            try {
                const res = await fetch(`${API_BASE}/financials/${encodeURIComponent(baseSymbol)}`);
                if (!res.ok) {
                    return;
                }

                const data = await res.json();
                const info = data.info || {};
                const valuation = data.valuation || {};
                const metrics = {
                    pe: info.stockPe || valuation.peTrailing,
                    roe: info.roe || valuation.roe
                };

                cardMetricCache.set(baseSymbol, metrics);
                applyCardMetrics(symbol, metrics);
            } catch (error) {
                // Card metrics are supplemental; keep price cards usable if financials are unavailable.
            } finally {
                pendingCardMetricSymbols.delete(baseSymbol);
            }
        });
}

function applyCardMetrics(symbol, metrics) {
    document.querySelectorAll(".stock-card").forEach(card => {
        if (card.dataset.symbol !== symbol) {
            return;
        }

        const peNode = card.querySelector("[data-card-pe]");
        const roeNode = card.querySelector("[data-card-roe]");
        if (peNode) {
            peNode.textContent = formatCardMetric(metrics.pe);
        }
        if (roeNode) {
            roeNode.textContent = formatCardMetric(metrics.roe, "%");
        }
    });
}

function getSearchMatches(limit = 8) {
    if (!searchTerm) {
        return [];
    }

    return fullUniverse
        .filter(stock => {
            const symbol = stock.symbol.toLowerCase();
            const name = (stock.name || "").toLowerCase();
            return symbol.includes(searchTerm) || name.includes(searchTerm);
        })
        .sort((a, b) => {
            const aSymbol = a.symbol.replace(".NS", "").toLowerCase();
            const bSymbol = b.symbol.replace(".NS", "").toLowerCase();
            const aName = (a.name || "").toLowerCase();
            const bName = (b.name || "").toLowerCase();
            const aStarts = aSymbol.startsWith(searchTerm) || aName.startsWith(searchTerm);
            const bStarts = bSymbol.startsWith(searchTerm) || bName.startsWith(searchTerm);
            if (aStarts !== bStarts) {
                return aStarts ? -1 : 1;
            }
            return Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0));
        })
        .slice(0, limit);
}

function renderSearchSuggestions() {
    if (!searchSuggestions || !searchInput) {
        return;
    }

    const matches = getSearchMatches();
    searchInput.setAttribute("aria-expanded", matches.length ? "true" : "false");

    if (!matches.length) {
        searchSuggestions.hidden = true;
        searchSuggestions.innerHTML = "";
        return;
    }

    searchSuggestions.hidden = false;
    searchSuggestions.innerHTML = matches.map(stock => {
        const symbol = stock.symbol.replace(".NS", "");
        const isPositive = Number(stock.change || 0) >= 0;
        return `
            <button class="search-suggestion" type="button" data-symbol="${escapeAttribute(stock.symbol)}" role="option">
                <span>
                    <strong>${escapeHtml(symbol)}</strong>
                    <small>${escapeHtml(stock.name || symbol)}</small>
                </span>
                <span class="suggestion-price">
                    <strong>₹${formatPrice(stock.price)}</strong>
                    <small class="${isPositive ? "gain" : "loss"}">${formatChange(stock.change)}</small>
                </span>
            </button>
        `;
    }).join("");
}

function closeSearchSuggestions() {
    if (!searchSuggestions || !searchInput) {
        return;
    }

    searchSuggestions.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
}

function getCardSize(index) {
    const isMobile = window.innerWidth <= 640;

    if (isMobile) {
        if (index === 0) return "large";
        if (index <= 3 && getCardIntensity(visibleStocks[index]?.change) >= 0.2) return "medium";
        return "small";
    }

    if (index === 0) return "large";      // Top stock
    if (index <= 2) return "medium";      // Top 3
    if (index <= 6) return "medium";      // Top 7
    return "small";                       // Rest
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
                    <strong>${escapeHtml(stock.symbol.replace(".NS", ""))}</strong>
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
    // statementTitle.textContent = `${stock.symbol.replace(".NS", "")} - ${stock.name || stock.symbol}`;
    statementTitle.textContent = stock.symbol.replace(".NS", "");
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
    const info = data.info || {};
    const range = formatSnapshotRange(info, valuation);
    const marketCap = formatSnapshotMarketCap(info, valuation);
    const trailingPe = formatSnapshotRatio(info.stockPe, valuation.peTrailing);
    const forwardPe = formatSnapshotRatio(valuation.peForward);
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
            <span>Market cap <strong>${marketCap}</strong></span>
            <span>Trailing P/E <strong>${trailingPe}</strong></span>
            <span>Forward P/E <strong>${forwardPe}</strong></span>
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

function getFirstFilledValue(...values) {
    return values.find(value => {
        if (value === null || value === undefined) {
            return false;
        }

        const text = String(value).trim();
        return text && text !== "--";
    });
}

function formatInfoDisplayText(display) {
    if (!display || display.value === "--") {
        return "--";
    }

    return [
        display.prefix,
        display.value,
        display.unit
    ].filter(Boolean).join(" ");
}

function formatInfoFallback(rawValue, fallbackPrefix = "", fallbackUnit = "") {
    return escapeHtml(formatInfoDisplayText(parseInfoDisplay(dedupeRepeatedMetricText(rawValue), fallbackPrefix, fallbackUnit)));
}

function formatSnapshotMarketCap(info, valuation) {
    const marketCap = getFirstFilledValue(valuation.marketCap);
    if (marketCap !== undefined) {
        return formatMarketCap(marketCap);
    }

    return formatInfoFallback(info.marketCap, "", "Cr");
}

function formatSnapshotRatio(...values) {
    return formatRatio(dedupeRepeatedMetricText(getFirstFilledValue(...values)));
}

function formatSnapshotRange(info, valuation) {
    const low = toFiniteNumber(valuation.fiftyTwoWeekLow);
    const high = toFiniteNumber(valuation.fiftyTwoWeekHigh);

    if (low !== null && high !== null && low > 0 && high > 0) {
        return `${formatCompactPrice(low)} - ${formatCompactPrice(high)}`;
    }

    const infoRange = formatInfoHighLowRange(info.highLow);
    if (infoRange) {
        return escapeHtml(infoRange);
    }

    return "--";
}

function dedupeRepeatedMetricText(rawValue) {
    const text = String(rawValue || "").replace(/\s+/g, " ").trim();

    if (!text || text === "--") {
        return rawValue;
    }

    const repeatedNumberWithUnit = text.match(/^([\d,]+(?:\.\d+)?)\s*[.\-/|]\s*\1\s*([A-Za-z%]+)?$/i);
    if (repeatedNumberWithUnit) {
        return [repeatedNumberWithUnit[1], repeatedNumberWithUnit[2]].filter(Boolean).join(" ");
    }

    const numberMatches = [...text.matchAll(/[\d,]+(?:\.\d+)?/g)];
    if (numberMatches.length > 1 && numberMatches.length % 2 === 0) {
        const mid = numberMatches.length / 2;
        const firstNumbers = numberMatches.slice(0, mid).map(match => match[0].replace(/,/g, ""));
        const secondNumbers = numberMatches.slice(mid).map(match => match[0].replace(/,/g, ""));

        if (firstNumbers.every((number, index) => number === secondNumbers[index])) {
            const keepEnd = numberMatches[mid - 1].index + numberMatches[mid - 1][0].length;
            const trailingUnit = text.match(/\s*(Cr\.?|%|x)\s*$/i)?.[1]?.replace(/\.$/, "") || "";
            const keptText = text.slice(0, keepEnd).trim();

            if (trailingUnit && !/(Cr\.?|%|x)$/i.test(keptText)) {
                return `${keptText} ${trailingUnit}`;
            }

            return keptText;
        }
    }

    const parts = text.split(" ");
    if (parts.length % 2 === 0) {
        const mid = parts.length / 2;
        const first = parts.slice(0, mid).join(" ");
        const second = parts.slice(mid).join(" ");
        if (first === second) {
            return first;
        }
    }

    const numbers = text.match(/[\d,]+(?:\.\d+)?/g) || [];
    const uniqueNumbers = [...new Set(numbers)];
    if (numbers.length > 1 && uniqueNumbers.length === 1 && text.replace(/[\d,.\s]/g, "") === "") {
        return uniqueNumbers[0];
    }

    return rawValue;
}

function formatInfoHighLowRange(rawValue) {
    const values = String(dedupeRepeatedMetricText(rawValue) || "")
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/g)
        ?.map(Number)
        .filter(value => Number.isFinite(value) && value > 0);

    if (!values || values.length < 2) {
        return "";
    }

    const [first, second] = values;
    const low = Math.min(first, second);
    const high = Math.max(first, second);
    return `${formatCompactPrice(low)} - ${formatCompactPrice(high)}`;
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
    const text = String(dedupeRepeatedMetricText(rawValue) || "--")
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
    return fullUniverse.find(stock => stock.symbol === symbol)
        || Object.values(fullData)
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
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHtml(String(value));
    }

    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatCardMetric(value, suffix = "") {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const normalizedValue = dedupeRepeatedMetricText(value);
    const cleaned = String(normalizedValue).replace(/[,xX%\s]/g, "");
    const number = Number(cleaned);
    if (Number.isNaN(number)) {
        return escapeHtml(String(normalizedValue));
    }

    return `${number.toLocaleString("en-IN", {
        maximumFractionDigits: 1
    })}${suffix}`;
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

    const cleanedValue = dedupeRepeatedMetricText(value);
    const text = String(cleanedValue || "").replace(/\s+/g, " ").trim();
    const number = Number(text.replace(/,/g, "").replace(/\bCr\.?\b/gi, "").trim());
    if (Number.isNaN(number)) {
        return escapeHtml(text);
    }

    if (/cr\.?/i.test(text)) {
        return `${number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
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

document.querySelectorAll("[data-index-view]").forEach(button => {
    button.addEventListener("click", () => loadView(button.dataset.indexView));
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
    renderSearchSuggestions();
});

searchInput.addEventListener("focus", renderSearchSuggestions);

if (searchSuggestions) {
    searchSuggestions.addEventListener("click", event => {
        const option = event.target.closest(".search-suggestion");
        if (!option) {
            return;
        }

        const stock = getStockBySymbol(option.dataset.symbol);
        if (stock) {
            closeSearchSuggestions();
            openStockPage(stock);
        }
    });
}

document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) {
        closeSearchSuggestions();
    }
});

if (drawerStockSearch) {
    drawerStockSearch.addEventListener("input", event => {
        searchTerm = event.target.value.trim().toLowerCase();
        if (searchInput && searchInput.value !== event.target.value) {
            searchInput.value = event.target.value;
        }
        renderGrid();
        renderSearchSuggestions();
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
        updateMobileHeaderState();
    }, 120);
});

function updateMobileHeaderState() {
    document.body.classList.remove("mobile-header-collapsed");
}

window.addEventListener("scroll", updateMobileHeaderState, { passive: true });

window.addEventListener("load", () => {
    prepareStockDetailPage();
    updateMobileHeaderState();
    loadHeatmap();
});
