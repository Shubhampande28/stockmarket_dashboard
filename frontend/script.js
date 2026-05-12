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
    niftynext50: "NIFTY NEXT 50",
    nifty100: "NIFTY 100",
    nifty200: "NIFTY 200",
    nifty500: "NIFTY 500",
    niftymidcap100: "NIFTY MIDCAP 100",
    niftysmallcap100: "NIFTY SMALLCAP 100",
    niftypsubank: "NIFTY PSU BANK",
    it: "IT",
    bank: "Banking",
    finance: "Finance",
    auto: "Auto",
    pharma: "Pharma",
    fmcg: "FMCG",
    metal: "Metal",
    energy: "Energy",
    realty: "Realty",
    telecom: "Telecom",
    cement: "Cement",
    consumer: "Consumer",
    infra: "Infrastructure",
    psu: "PSU",
    chemicals: "Chemicals",
    media: "Media",
    others: "Others"
};

let currentView = "nifty50";
let activeMarketFilter = "all";
let activeSectorFilter = "all";
let fullData = {};
let fullUniverse = [];
let indexQuotes = {};
let visibleStocks = [];
let searchTerm = "";
let resizeTimer;
let activeStatementType = "news";
let activeFinancials = null;
let activeStock = null;
let selectedWorkspaceStock = null;
let activeTrendTab = "gainers";
let standaloneStockRendered = false;
let tradingViewScriptPromise = null;
let activeRoute = "home";
let heatmapRenderToken = 0;
const API_BASE = "";
const cardMetricCache = new Map();
const pendingCardMetricSymbols = new Set();
let cardMetricQueue = Promise.resolve();
const pendingMarketStatsSymbols = new Set();
const loadedMarketStatsSymbols = new Set();

const routeConfig = {
    home: { path: "/", label: "Home" },
    markets: { path: "/markets", label: "Markets" },
    heatmap: { path: "/heatmap", label: "Heatmap" },
    financials: { path: "/financials", label: "Financial Statements" },
    insights: { path: "/insights", label: "Insights" }
};

const pathRoutes = Object.fromEntries(
    Object.entries(routeConfig).map(([route, config]) => [config.path, route])
);

const sectorViewKeys = [
    "bank",
    "energy",
    "metal",
    "realty",
    "telecom",
    "infra",
    "psu",
    "consumer",
    "finance",
    "cement",
    "chemicals",
    "media",
    "it",
    "pharma",
    "fmcg",
    "auto"
];

const marketFilterLabels = {
    all: "All",
    largecap: "Large Cap",
    midcap: "Mid Cap",
    smallcap: "Small Cap",
    gainers: "Gainers",
    losers: "Losers",
    volume: "High Volume",
    active: "Most Active",
    gapup: "Gap Up",
    gapdown: "Gap Down",
    high52: "Near 52W High",
    low52: "Near 52W Low",
    bullish: "Bullish",
    bearish: "Bearish"
};

const marketScopeOptions = [
    ["nifty50", "NIFTY 50"],
    ["sensex", "SENSEX"],
    ["midcpnifty", "MIDCPNIFTY"],
    ["banknifty", "NIFTY BANK"],
    ["finnifty", "NIFTY FIN SERVICE"],
    ["it", "NIFTY IT"],
    ["auto", "NIFTY AUTO"],
    ["pharma", "NIFTY PHARMA"],
    ["fmcg", "NIFTY FMCG"],
    ["energy", "NIFTY ENERGY"],
    ["metal", "NIFTY METAL"],
    ["realty", "NIFTY REALTY"]
];

const sectorFilterOptions = [
    ["all", "All sectors"],
    ["bank", "Banking"],
    ["finance", "Finance"],
    ["consumer", "Consumer"],
    ["it", "IT"],
    ["pharma", "Pharma"],
    ["fmcg", "FMCG"],
    ["auto", "Auto"],
    ["energy", "Energy"],
    ["metal", "Metals"],
    ["cement", "Cement"],
    ["psu", "PSU"],
    ["telecom", "Telecom"],
    ["realty", "Realty"],
    ["infra", "Infra"],
    ["chemicals", "Chemicals"],
    ["media", "Media"]
];

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
const platform = document.getElementById("platform");
const marketsPage = document.getElementById("marketsPage");
const heatmapPanel = document.getElementById("heatmapPanel");
const trendsPanel = document.getElementById("trendsPanel");
const financialStatementsPage = document.getElementById("financialStatementsPage");
let intelligencePanel = document.getElementById("intelligencePanel");
let sectorPerformanceList = document.getElementById("sectorPerformanceList");
let trendHeroGrid = document.getElementById("trendHeroGrid");
let sectorMomentumGrid = document.getElementById("sectorMomentumGrid");
let trendMoversList = document.getElementById("trendMoversList");
let financialSearchInput = null;
let financialTabs = null;
let financialContent = null;
let selectedFinancialStock = null;
let financialPageData = null;
let financialPageError = "";
let financialPageLoadingSymbol = "";
let activeFinancialPageTab = "overview";

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
        syncFilterDropdownOptions();
        updateIndexCards();
        updateSummary();
        renderGrid();
        hydrateMarketStatsForScope(currentView);
        setStatus("ready", "Market ready");
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

function setupPremiumExperience() {
    if (!platform || !heatmapPanel || platform.classList.contains("premium-ready")) {
        return;
    }

    platform.classList.add("premium-ready");

    if (marketsPage && !marketsPage.innerHTML.trim()) {
        marketsPage.innerHTML = `
            <header class="route-page-head markets-page-head">
                <div>
                    <p class="workspace-eyebrow">Markets</p>
                    <h2>Market Overview</h2>
                    <p>Track breadth, index momentum, sector leadership, and the stocks driving today's session.</p>
                </div>
                <div class="route-live-chip">
                    <span class="status-dot"></span>
                    <strong>Live market feel</strong>
                </div>
            </header>
            <div class="market-overview-grid" id="marketOverviewGrid"></div>
            <section class="route-content-grid">
                <div class="route-panel">
                    <div class="route-section-head">
                        <p class="workspace-eyebrow">Trending Stocks</p>
                        <h3>Momentum Leaders</h3>
                    </div>
                    <div class="market-trending-list" id="marketTrendingList"></div>
                </div>
                <div class="route-panel">
                    <div class="route-section-head">
                        <p class="workspace-eyebrow">Index Summaries</p>
                        <h3>Major Benchmarks</h3>
                    </div>
                    <div class="market-index-summary" id="marketIndexSummary"></div>
                </div>
            </section>
        `;
    }

    const workspaceGrid = document.createElement("div");
    workspaceGrid.className = "workspace-grid";
    const sectorSidebar = document.createElement("aside");
    sectorSidebar.className = "sector-sidebar";
    sectorSidebar.setAttribute("aria-label", "Sector intelligence");
sectorSidebar.innerHTML = `
    <section>
        <p class="workspace-eyebrow">Sector Intelligence</p>
        <div class="market-context-card" id="sectorPerformanceList"></div>
    </section>

    <section>
        <label class="heatmap-control-label" for="marketScopeSelect">
            Market Scope
        </label>

        <select class="heatmap-control-select compact" id="marketScopeSelect" data-market-scope-select>
            ${marketScopeOptions.map(([value, label]) => `
                <option value="${value}">${label}</option>
            `).join("")}
        </select>

        <label class="heatmap-control-label" for="sectorSelect">
            Sector
        </label>

        <select class="heatmap-control-select compact" id="sectorSelect" data-sector-select>
            ${sectorFilterOptions.map(([value, label]) => `
                <option value="${value}">${label}</option>
            `).join("")}
        </select>

        <label class="heatmap-control-label" for="marketFilterSelect">
            Filters
        </label>

        <select class="heatmap-control-select" id="marketFilterSelect" data-market-filter-select>
            <option value="all">All</option>

            <optgroup label="Market Cap">
                <option value="largecap">Large Cap</option>
                <option value="midcap">Mid Cap</option>
                <option value="smallcap">Small Cap</option>
            </optgroup>

            <optgroup label="Performance">
                <option value="gainers">Top Gainers</option>
                <option value="losers">Top Losers</option>
                <option value="active">Most Active</option>
                <option value="volume">High Volume</option>
            </optgroup>

            <optgroup label="Price Action">
                <option value="gapup">Gap Up</option>
                <option value="gapdown">Gap Down</option>
                <option value="high52">Near 52W High</option>
                <option value="low52">Near 52W Low</option>
            </optgroup>

            <optgroup label="Trend">
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
            </optgroup>
        </select>
    </section>
`;
    const heatmapStage = document.createElement("section");
    heatmapStage.className = "heatmap-stage";
    while (heatmapPanel.childNodes.length) {
        heatmapStage.appendChild(heatmapPanel.childNodes[0]);
    }

    intelligencePanel = document.createElement("aside");
    intelligencePanel.className = "intelligence-panel";
    intelligencePanel.id = "intelligencePanel";
    intelligencePanel.setAttribute("aria-label", "Market intelligence");



    workspaceGrid.append(sectorSidebar, heatmapStage);
    heatmapPanel.appendChild(workspaceGrid);
    sectorPerformanceList = document.getElementById("sectorPerformanceList");

    if (trendsPanel && !trendsPanel.innerHTML.trim()) {
        trendsPanel.innerHTML = `
            <div class="trend-hero-grid" id="trendHeroGrid"></div>
            <section class="trend-section trend-timeline-section">
                <p class="workspace-eyebrow">Intraday Timeline</p>
                <div class="trend-timeline">
                    <button type="button"><span>09:15</span><strong>Banking weak opening</strong></button>
                    <button type="button"><span>10:20</span><strong>IT momentum pickup</strong></button>
                    <button type="button"><span>11:05</span><strong>Reliance breakout</strong></button>
                    <button type="button"><span>12:10</span><strong>Pharma reversal</strong></button>
                </div>
            </section>
            <section class="trend-section">
                <p class="workspace-eyebrow">Sector Momentum</p>
                <div class="sector-momentum-grid" id="sectorMomentumGrid"></div>
            </section>
            <section class="trend-section">
                <div class="trend-section-head">
                    <p class="workspace-eyebrow">Top Movers</p>
                    <div class="trend-tabs" role="tablist" aria-label="Top movers">
                        <button class="trend-tab active" type="button" data-trend-tab="gainers">Top Gainers</button>
                        <button class="trend-tab" type="button" data-trend-tab="losers">Top Losers</button>
                        <button class="trend-tab" type="button" data-trend-tab="active">Most Active</button>
                        <button class="trend-tab" type="button" data-trend-tab="breakouts">Breakouts</button>
                    </div>
                </div>
                <div class="trend-movers-list" id="trendMoversList"></div>
            </section>
            <section class="ai-summary-card">
                <p class="workspace-eyebrow">AI Market Summary</p>
                <blockquote id="aiMarketSummary">Financials and Energy are leading today's market strength while IT remains under pressure. Breadth remains neutral with selective midcap participation.</blockquote>
            </section>
            <section class="trend-section">
                <div class="trend-section-head">
                    <p class="workspace-eyebrow">Research Desk</p>
                    <h3>Research Cards</h3>
                </div>
                <div class="insight-research-grid">
                    <article><span>Morning Note</span><strong>Large-cap breadth is improving while defensives stay selective.</strong></article>
                    <article><span>AI Screen</span><strong>Volume expansion is clustered in banks, autos, and energy leaders.</strong></article>
                    <article><span>Risk Watch</span><strong>Weak closes below VWAP remain concentrated in IT laggards.</strong></article>
                </div>
            </section>
        `;
        trendHeroGrid = document.getElementById("trendHeroGrid");
        sectorMomentumGrid = document.getElementById("sectorMomentumGrid");
        trendMoversList = document.getElementById("trendMoversList");
    }

    if (financialStatementsPage && !financialStatementsPage.innerHTML.trim()) {
        financialStatementsPage.innerHTML = `
            <header class="financial-page-head">
                <div>
                    <p class="workspace-eyebrow">Financial Statements</p>
                    <h2>Company Fundamentals</h2>
                </div>
                <div class="financial-head-actions">
                    <a class="annual-report-button" id="annualReportButton" href="#" target="_blank" rel="noopener noreferrer" download hidden>
                        Download Annual Report
                    </a>
                    <div class="financial-search-wrap">
                        <label for="financialCompanySearch">Company</label>
                        <input id="financialCompanySearch" type="search" placeholder="Search company..." autocomplete="off">
                        <div class="financial-search-results" id="financialSearchResults" hidden></div>
                    </div>
                </div>
            </header>
            <div class="financial-tabs" id="financialTabs" role="tablist" aria-label="Financial statement tabs">
                <button class="financial-tab active" type="button" data-financial-tab="overview">Overview</button>
                <button class="financial-tab" type="button" data-financial-tab="income">Income Statement</button>
                <button class="financial-tab" type="button" data-financial-tab="balance">Balance Sheet</button>
                <button class="financial-tab" type="button" data-financial-tab="cashflow">Cash Flow</button>
                <button class="financial-tab" type="button" data-financial-tab="ratios">Ratios</button>
            </div>
            <section class="financial-content" id="financialContent"></section>
        `;
        financialSearchInput = document.getElementById("financialCompanySearch");
        financialTabs = document.getElementById("financialTabs");
        financialContent = document.getElementById("financialContent");
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

function getBaseSymbol(symbol) {
    return String(symbol || "").replace(".NS", "").toUpperCase();
}

function mergeMarketStats(stats) {
    if (!stats || typeof stats !== "object") {
        return false;
    }

    const bySymbol = new Map();
    Object.values(fullData).flat().forEach(stock => {
        if (stock?.symbol) {
            bySymbol.set(getBaseSymbol(stock.symbol), stock);
        }
    });

    let changed = false;
    Object.entries(stats).forEach(([symbol, values]) => {
        const stock = bySymbol.get(getBaseSymbol(symbol));
        if (!stock || !values || typeof values !== "object") {
            return;
        }

        ["marketCap", "pe", "volume", "fiftyTwoWeekHigh", "fiftyTwoWeekLow"].forEach(key => {
            if (values[key] !== null && values[key] !== undefined && stock[key] !== values[key]) {
                stock[key] = values[key];
                changed = true;
            }
        });
        loadedMarketStatsSymbols.add(getBaseSymbol(symbol));
    });

    if (changed) {
        fullUniverse = buildFullUniverse(fullData);
    }

    return changed;
}

async function hydrateMarketStatsForScope(scope = currentView) {
    const stocks = getScopeStocks(scope);
    const symbols = stocks
        .map(stock => getBaseSymbol(stock.symbol))
        .filter(symbol => symbol && !loadedMarketStatsSymbols.has(symbol) && !pendingMarketStatsSymbols.has(symbol))
        .slice(0, 250);

    if (!symbols.length) {
        return;
    }

    symbols.forEach(symbol => pendingMarketStatsSymbols.add(symbol));

    try {
        const res = await fetch(`${API_BASE}/market-stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols })
        });
        if (!res.ok) {
            return;
        }

        const data = await res.json();
        if (mergeMarketStats(data.stats)) {
            updateSummary();
            renderGrid();
        }
    } catch (error) {
        // Supplemental market stats should never block the base heatmap.
    } finally {
        symbols.forEach(symbol => pendingMarketStatsSymbols.delete(symbol));
    }
}

function hasLoadedStocks(key) {
    return Array.isArray(fullData[key]) && fullData[key].length > 0;
}

function getAvailableMarketScopeOptions() {
    if (!Object.keys(fullData).length) {
        return marketScopeOptions;
    }

    const options = marketScopeOptions.filter(([value]) => hasLoadedStocks(value));
    return options.length ? options : [["nifty50", "NIFTY 50"]];
}

function getAvailableSectorOptions(scope = currentView) {
    const scopeStocks = getScopeStocks(scope);
    if (!scopeStocks.length) {
        return [["all", "All sectors"]];
    }

    const scopeSymbols = new Set(scopeStocks.map(stock => stock.symbol));
    const options = sectorFilterOptions.filter(([value]) => {
        if (value === "all") {
            return true;
        }

        return (fullData[value] || []).some(stock => scopeSymbols.has(stock.symbol));
    });

    return options.length ? options : [["all", "All sectors"]];
}

function renderSelectOptions(select, options) {
    if (!select) {
        return;
    }

    const nextMarkup = options
        .map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`)
        .join("");

    if (select.innerHTML !== nextMarkup) {
        select.innerHTML = nextMarkup;
    }
}

function syncFilterDropdownOptions() {
    const marketScopeSelect = document.getElementById("marketScopeSelect");
    const availableScopes = getAvailableMarketScopeOptions();
    renderSelectOptions(marketScopeSelect, availableScopes);

    const sectorSelect = document.getElementById("sectorSelect");
    const availableSectors = getAvailableSectorOptions(currentView);
    renderSelectOptions(sectorSelect, availableSectors);

    if (!availableSectors.some(([value]) => value === activeSectorFilter)) {
        activeSectorFilter = "all";
    }
}

function setLoading(isLoading) {
    refreshButton.disabled = isLoading;

    if (isLoading) {
        renderHeatmapSkeleton();
        showMessage("Preparing market heatmap...", "loading");
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
        updateTopExperience();
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
    updateTopExperience();
}

function updateTopExperience() {
    const stocks = fullData.all || [];
    const gainers = stocks.filter(stock => Number(stock.change || 0) > 0);
    const losers = stocks.filter(stock => Number(stock.change || 0) < 0);
    const breadthValue = document.getElementById("marketBreadthValue");
    const breadthChange = document.getElementById("marketBreadthChange");
    const topSectorValue = document.getElementById("topSectorValue");
    const topSectorChange = document.getElementById("topSectorChange");
    const heroMarketCount = document.getElementById("heroMarketCount");
    const heroSentiment = document.getElementById("heroSentiment");
    const heroBreadth = document.getElementById("heroBreadth");
    const heroTopSector = document.getElementById("heroTopSector");

    if (heroMarketCount) {
        heroMarketCount.textContent = stocks.length ? `${stocks.length} stocks tracked` : "-- stocks tracked";
    }

    const breadthRatio = stocks.length ? (gainers.length / stocks.length) * 100 : 0;
    const sentiment = breadthRatio >= 58 ? "Bullish momentum" : breadthRatio <= 42 ? "Defensive market" : "Mixed momentum";

    if (heroSentiment) {
        heroSentiment.textContent = stocks.length ? sentiment : "Scanning market";
    }
    if (heroBreadth) {
        heroBreadth.textContent = stocks.length ? `${gainers.length} advancing / ${losers.length} declining` : "Breadth pending";
    }
    if (breadthValue) {
        breadthValue.textContent = stocks.length ? `${gainers.length} / ${losers.length}` : "--";
    }
    if (breadthChange) {
        breadthChange.textContent = stocks.length ? `${breadthRatio.toFixed(0)}% advancing` : "Waiting for data";
        breadthChange.classList.toggle("gain", breadthRatio >= 50 && stocks.length > 0);
        breadthChange.classList.toggle("loss", breadthRatio < 50 && stocks.length > 0);
    }

    const rankedSectors = sectorViewKeys
        .map(key => {
            const sectorStocks = fullData[key] || [];
            const average = sectorStocks.length
                ? sectorStocks.reduce((total, stock) => total + Number(stock.change || 0), 0) / sectorStocks.length
                : null;
            return { key, average };
        })
        .filter(sector => sector.average !== null)
        .sort((a, b) => b.average - a.average);
    const topSector = rankedSectors[0];

    if (topSectorValue) {
        topSectorValue.textContent = topSector ? viewLabels[topSector.key] : "--";
    }
    if (topSectorChange) {
        topSectorChange.textContent = topSector ? formatChange(topSector.average) : "Waiting for data";
        topSectorChange.classList.toggle("gain", Boolean(topSector) && topSector.average >= 0);
        topSectorChange.classList.toggle("loss", Boolean(topSector) && topSector.average < 0);
    }
    if (heroTopSector) {
        heroTopSector.textContent = topSector ? `${viewLabels[topSector.key]} ${formatChange(topSector.average)}` : "--";
    }
    renderSectorPerformance(rankedSectors);
    renderIntelligencePanel();
    renderMarketsPage();
    renderTrendsExperience();
    renderFinancialPage();
}

function renderMarketsPage() {
    const overviewGrid = document.getElementById("marketOverviewGrid");
    const trendingList = document.getElementById("marketTrendingList");
    const indexSummary = document.getElementById("marketIndexSummary");

    if (!overviewGrid || !trendingList || !indexSummary) {
        return;
    }

    const stocks = fullData.all || [];
    const gainers = getRankedGainers([...stocks]);
    const losers = getRankedLosers([...stocks]);
    const sectors = getSectorRankings();
    const topSector = sectors[0];
    const breadthRatio = stocks.length ? (gainers.length / stocks.length) * 100 : 0;
    const mostActive = [...stocks].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))[0] || gainers[0];

    overviewGrid.innerHTML = [
        ["Market Breadth", stocks.length ? `${gainers.length} / ${losers.length}` : "--", stocks.length ? `${breadthRatio.toFixed(0)}% advancing` : "Waiting for data"],
        ["Top Sector", topSector ? viewLabels[topSector.key] : "--", topSector ? formatChange(topSector.average) : "Waiting for data"],
        ["Most Active", mostActive ? mostActive.symbol.replace(".NS", "") : "--", mostActive ? formatPrice(mostActive.price) : "Waiting for data"],
        ["Tracked Universe", stocks.length ? `${stocks.length} stocks` : "--", "Real-time scan"]
    ].map(item => `
        <article class="market-overview-card-lite">
            <span>${escapeHtml(item[0])}</span>
            <strong>${escapeHtml(item[1])}</strong>
            <small>${escapeHtml(item[2])}</small>
        </article>
    `).join("");

    trendingList.innerHTML = (gainers.length ? gainers : visibleStocks).slice(0, 8).map(stock => `
        <button class="market-trending-row" type="button" data-symbol="${escapeAttribute(stock.symbol)}">
            <span>${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
            <strong>${formatPrice(stock.price)}</strong>
            <em class="${Number(stock.change || 0) >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</em>
        </button>
    `).join("") || "<p>Waiting for market data</p>";

    const indexes = ["nifty50", "banknifty", "finnifty", "sensex", "midcpnifty"];
    indexSummary.innerHTML = indexes.map(key => {
        const quote = indexQuotes[key] || {};
        const change = quote.change === null || quote.change === undefined ? null : Number(quote.change || 0);
        return `
            <button class="market-index-row" type="button" data-index-view="${escapeAttribute(key)}">
                <span>${escapeHtml(viewLabels[key] || key)}</span>
                <strong>${quote.price === null || quote.price === undefined ? "--" : formatPrice(quote.price)}</strong>
                <em class="${change === null ? "" : change >= 0 ? "gain" : "loss"}">${change === null ? "Live quote unavailable" : formatChange(change)}</em>
            </button>
        `;
    }).join("");
}

function renderSectorPerformance(rankedSectors = getSectorRankings()) {
    if (!sectorPerformanceList) {
        return;
    }

    const fallback = [
        { key: "bank", average: -0.8 },
        { key: "energy", average: 1.2 },
        { key: "metal", average: 0.6 },
        { key: "realty", average: 0.4 },
        { key: "telecom", average: 0.2 },
        { key: "infra", average: 0.5 },
        { key: "psu", average: -0.2 },
        { key: "finance", average: 0.9 },
        { key: "chemicals", average: -0.3 },
        { key: "media", average: 0.1 },
        { key: "it", average: 2.3 },
        { key: "pharma", average: -1.1 },
        { key: "fmcg", average: 0.3 },
        { key: "auto", average: 0.5 }
    ];
    const rankedByKey = new Map(rankedSectors.map(sector => [sector.key, sector]));
    const sectors = sectorViewKeys.map(key => rankedByKey.get(key) || fallback.find(sector => sector.key === key) || { key, average: 0 });
    const sectorSelect = document.getElementById("sectorSelect");
    if (sectorSelect) {
        sectorSelect.value = sectorFilterOptions.some(option => option[0] === activeSectorFilter) ? activeSectorFilter : "all";
    }

    const scopeStocks = getScopeStocks(currentView);
    const activeSector = activeSectorFilter === "all" ? sectors[0] : sectors.find(sector => sector.key === activeSectorFilter);
    const positive = Number(activeSector?.average || 0) >= 0;
    const sectorName = activeSectorFilter === "all"
        ? viewLabels[activeSector?.key] || "Market"
        : viewLabels[activeSectorFilter] || activeSectorFilter;
    const direction = positive ? "showing strength" : "under pressure";
    const summary = activeSector
        ? `${sectorName} is ${direction} with ${formatChange(activeSector.average)} average movement. ${scopeStocks.length || "--"} stocks are in the selected scope.`
        : `${viewLabels[currentView] || "Selected market"} is ready. Choose a sector or filter to narrow the heatmap.`;
    sectorPerformanceList.innerHTML = `
        <strong>${escapeHtml(sectorName)}</strong>
        <p>${escapeHtml(summary)}</p>
    `;
}

function getSectorRankings() {
    return sectorViewKeys
        .map(key => {
            const sectorStocks = fullData[key] || [];
            const average = sectorStocks.length
                ? sectorStocks.reduce((total, stock) => total + Number(stock.change || 0), 0) / sectorStocks.length
                : null;
            const leader = [...sectorStocks].sort((a, b) => Number(b.change || 0) - Number(a.change || 0))[0];
            return { key, average, leader };
        })
        .filter(sector => sector.average !== null)
        .sort((a, b) => b.average - a.average);
}

function renderIntelligencePanel() {
    if (!intelligencePanel) {
        return;
    }

    const stocks = fullData.all?.length ? fullData.all : visibleStocks;
    const gainers = getRankedGainers([...stocks]).slice(0, 5);
    const losers = getRankedLosers([...stocks]).slice(0, 5);
    const breadth = stocks.length
        ? `${gainers.length} gainers / ${losers.length} losers`
        : "Waiting for live breadth";

    intelligencePanel.innerHTML = `
        <p class="workspace-eyebrow">Market Intelligence</p>
        ${renderIntelList("Top Gainers", gainers)}
        ${renderIntelList("Top Losers", losers)}
        <section class="intel-section">
            <h3>Market Breadth</h3>
            <p>${escapeHtml(breadth)}</p>
        </section>
    `;
}

function renderIntelList(title, stocks) {
    return `
        <section class="intel-section">
            <h3>${escapeHtml(title)}</h3>
            <div class="intel-stock-list">
                ${stocks.map(stock => `
                    <button type="button" data-symbol="${escapeAttribute(stock.symbol)}">
                        <span>${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
                        <strong class="${Number(stock.change || 0) >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</strong>
                    </button>
                `).join("") || "<p>Waiting for data</p>"}
            </div>
        </section>
    `;
}

function renderTrendsExperience() {
    if (!trendHeroGrid || !sectorMomentumGrid || !trendMoversList) {
        return;
    }

    const stocks = fullData.all || [];
    const gainers = getRankedGainers([...stocks]);
    const losers = getRankedLosers([...stocks]);
    const sectors = getSectorRankings();
    const topSector = sectors[0];
    const mostActive = [...stocks].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))[0] || gainers[0];
    const sentiment = stocks.length && gainers.length / stocks.length >= 0.55 ? "Constructive" : "Selective";

    trendHeroGrid.innerHTML = [
        ["Market Sentiment", sentiment, `${gainers.length}/${losers.length} breadth`],
        ["Top Sector", topSector ? viewLabels[topSector.key] : "--", topSector ? formatChange(topSector.average) : "Waiting"],
        ["Most Active Stock", mostActive ? mostActive.symbol.replace(".NS", "") : "--", mostActive ? formatPrice(mostActive.price) : "Waiting"],
        ["Volatility", losers.length > gainers.length ? "Elevated" : "Moderate", "Intraday range"]
    ].map(item => `
        <article class="trend-hero-card">
            <span>${escapeHtml(item[0])}</span>
            <strong>${escapeHtml(item[1])}</strong>
            <small>${escapeHtml(item[2])}</small>
        </article>
    `).join("");

    sectorMomentumGrid.innerHTML = (sectors.length ? sectors : [
        { key: "bank", average: 0.82, leader: { symbol: "HDFCBANK" } },
        { key: "energy", average: 0.68, leader: { symbol: "RELIANCE" } },
        { key: "it", average: -0.38, leader: { symbol: "INFY" } },
        { key: "pharma", average: -0.22, leader: { symbol: "SUNPHARMA" } }
    ]).slice(0, 6).map(sector => {
        const score = Math.min(99, Math.max(40, Math.round(62 + Number(sector.average || 0) * 8)));
        const bullish = Number(sector.average || 0) >= 0;
        return `
            <article class="sector-momentum-card">
                <span>${escapeHtml(viewLabels[sector.key] || sector.key)}</span>
                <strong>Strength ${score}</strong>
                <em class="${bullish ? "gain" : "loss"}">${bullish ? "Up Bullish" : "Down Defensive"}</em>
                <small>Leader: ${escapeHtml(sector.leader?.symbol?.replace(".NS", "") || "--")}</small>
            </article>
        `;
    }).join("");

    renderTrendMovers();
}

function renderTrendMovers() {
    if (!trendMoversList) {
        return;
    }

    const stocks = fullData.all || [];
    const source = activeTrendTab === "losers"
        ? getRankedLosers([...stocks])
        : activeTrendTab === "active"
            ? [...stocks].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))
            : getRankedGainers([...stocks]);

    trendMoversList.innerHTML = source.slice(0, 6).map(stock => `
        <button class="trend-mover-row" type="button" data-symbol="${escapeAttribute(stock.symbol)}">
            <span>${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
            <strong>₹${formatPrice(stock.price)}</strong>
            <em class="${Number(stock.change || 0) >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</em>
        </button>
    `).join("") || "<p>Waiting for market data</p>";
}

async function loadFinancialPageData(stock) {
    if (!stock) {
        return;
    }

    const symbol = stock.symbol;
    if (financialPageLoadingSymbol === symbol) {
        return;
    }

    financialPageLoadingSymbol = symbol;
    financialPageError = "";
    financialPageData = null;
    renderFinancialPage();

    try {
        const res = await fetch(`${API_BASE}/financials/${encodeURIComponent(symbol)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || "Unable to load financial statements.");
        }

        if (selectedFinancialStock?.symbol === symbol) {
            financialPageData = data;
            financialPageError = "";
        }
    } catch (error) {
        if (selectedFinancialStock?.symbol === symbol) {
            financialPageError = error.message || "Unable to load financial statements.";
        }
    } finally {
        if (financialPageLoadingSymbol === symbol) {
            financialPageLoadingSymbol = "";
        }
        renderFinancialPage();
    }
}

function selectFinancialStock(stock, shouldNavigate = false) {
    if (!stock) {
        return;
    }

    const changed = selectedFinancialStock?.symbol !== stock.symbol;
    selectedFinancialStock = stock;
    if (changed) {
        financialPageData = null;
        financialPageError = "";
        activeFinancialPageTab = "overview";
        document.querySelectorAll(".financial-tab").forEach(button => {
            button.classList.toggle("active", button.dataset.financialTab === activeFinancialPageTab);
        });
    }
    if (financialSearchInput) {
        financialSearchInput.value = stock.symbol.replace(".NS", "");
    }
    if (shouldNavigate) {
        navigateTo("financials");
    }
    renderFinancialPage();
    loadFinancialPageData(stock);
}

function renderFinancialPage() {
    if (!financialContent) {
        return;
    }

    if (activeRoute !== "financials" && !selectedFinancialStock) {
        return;
    }

    const stock = selectedFinancialStock || fullUniverse[0] || fullData.nifty50?.[0] || fullData.all?.[0];
    selectedFinancialStock = stock || null;

    if (financialSearchInput && stock && !financialSearchInput.value) {
        financialSearchInput.value = stock.symbol.replace(".NS", "");
    }

    if (!stock) {
        updateAnnualReportButton(null);
        financialContent.innerHTML = `<p class="financial-empty">Search a company to view financial statements.</p>`;
        return;
    }

    const symbol = stock.symbol.replace(".NS", "");
    const loadingThisStock = financialPageLoadingSymbol === stock.symbol;
    const data = financialPageData?.symbol?.replace(".NS", "") === symbol ? financialPageData : null;

    if (loadingThisStock && !data) {
        updateAnnualReportButton(null);
        financialContent.innerHTML = `
            <div class="financial-company-strip">
                <span>${escapeHtml(stock.name || symbol)}</span>
                <strong>${escapeHtml(symbol)}</strong>
                <em>Fetching INR statements...</em>
            </div>
            <p class="financial-empty">Loading Screener financials and NSE report links.</p>
        `;
        return;
    }

    if (financialPageError && !data) {
        updateAnnualReportButton(null);
        financialContent.innerHTML = `
            <div class="financial-company-strip">
                <span>${escapeHtml(stock.name || symbol)}</span>
                <strong>${escapeHtml(symbol)}</strong>
                <em class="${Number(stock.change || 0) >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</em>
            </div>
            <p class="financial-empty">${escapeHtml(financialPageError)}</p>
        `;
        return;
    }

    if (!data) {
        updateAnnualReportButton(null);
        loadFinancialPageData(stock);
        return;
    }

    updateAnnualReportButton(data);

    if (activeFinancialPageTab === "overview") {
        const valuation = data.valuation || {};
        const info = data.info || {};
        const statementSource = data.source?.url
            ? `<a href="${escapeAttribute(data.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml([data.source.provider, data.source.label].filter(Boolean).join(" - "))}</a>`
            : escapeHtml([data.source?.provider, data.source?.label].filter(Boolean).join(" - ") || "Statement source unavailable");
        const annualReport = data.source?.annualReport;
        const reportLink = annualReport?.url
            ? `<a href="${escapeAttribute(annualReport.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml([annualReport.provider, annualReport.year].filter(Boolean).join(" - ") || "Download annual report")}</a>`
            : "Annual report link unavailable";
        financialContent.innerHTML = `
            <div class="financial-company-strip">
                <span>${escapeHtml(data.name || stock.name || symbol)}</span>
                <strong>${escapeHtml(symbol)}</strong>
                <em class="${Number(stock.change || 0) >= 0 ? "gain" : "loss"}">${formatChange(stock.change)}</em>
            </div>
            <div class="financial-metric-grid">
                ${renderFinancialMetric("Market Cap", formatSnapshotMarketCap(info, valuation))}
                ${renderFinancialMetric("Current Price", formatCompactPrice(stock.price))}
                ${renderFinancialMetric("Stock P/E", formatSnapshotRatio(info.stockPe, valuation.peTrailing))}
                ${renderFinancialMetric("ROE", formatInfoDisplayText(parseInfoDisplay(info.roe || formatPercentValue(valuation.roe), "", "%")))}
                ${renderFinancialMetric("ROCE", formatInfoDisplayText(parseInfoDisplay(info.roce || formatPercentValue(valuation.roce), "", "%")))}
                ${renderFinancialMetric("52W Range", formatSnapshotRange(info, valuation))}
            </div>
            <div class="snapshot-source">
                <span>Data sources</span>
                <strong>Statements: ${statementSource}</strong>
                <strong>Official filing: ${reportLink}</strong>
                <strong>${escapeHtml(data.sourceNote || "Figures are shown in INR crore where available.")}</strong>
            </div>
        `;
        return;
    }

    const statementMap = {
        income: data.statements?.profitLoss,
        balance: data.statements?.balanceSheet,
        cashflow: data.statements?.cashFlow
    };

    if (activeFinancialPageTab === "ratios") {
        financialContent.innerHTML = renderFinancialTable(buildRatioRows(data, stock));
        return;
    }

    financialContent.innerHTML = renderFinancialStatementTable(statementMap[activeFinancialPageTab] || statementMap.income);
}

function updateAnnualReportButton(data) {
    const button = document.getElementById("annualReportButton");
    if (!button) {
        return;
    }

    const report = data?.source?.annualReport;
    if (!report?.url) {
        button.hidden = true;
        button.removeAttribute("href");
        button.removeAttribute("download");
        return;
    }

    button.hidden = false;
    button.href = report.url;
    button.setAttribute("download", "");
    button.textContent = report.year ? `Download Annual Report ${report.year}` : "Download Annual Report";
}

function renderFinancialMetric(label, value) {
    return `
        <article class="financial-metric-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </article>
    `;
}

function renderFinancialTable(rows) {
    return `
        <div class="financial-table-wrap">
            <table class="financial-clean-table">
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            <th scope="row">${escapeHtml(row[0])}</th>
                            <td>${escapeHtml(row[1])}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderFinancialStatementTable(statement) {
    if (!statement?.rows?.length) {
        return `<p class="financial-empty">This statement is not available from the INR source for the selected stock.</p>`;
    }

    return `
        <div class="financial-table-wrap">
            <table class="financial-clean-table">
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

function buildRatioRows(data, stock) {
    const info = data.info || {};
    const valuation = data.valuation || {};
    return [
        ["Market Cap", formatSnapshotMarketCap(info, valuation)],
        ["Current Price", formatCompactPrice(stock.price)],
        ["Stock P/E", formatSnapshotRatio(info.stockPe, valuation.peTrailing)],
        ["Forward P/E", formatSnapshotRatio(valuation.peForward)],
        ["Price to Book", formatSnapshotRatio(valuation.priceToBook)],
        ["Book Value", formatInfoDisplayText(parseInfoDisplay(info.bookValue || formatCurrencyValue(valuation.bookValue), "₹", ""))],
        ["Dividend Yield", formatInfoDisplayText(parseInfoDisplay(info.dividendYield || formatPercentValue(valuation.dividendYield), "", "%"))],
        ["ROE", formatInfoDisplayText(parseInfoDisplay(info.roe || formatPercentValue(valuation.roe), "", "%"))],
        ["ROCE", formatInfoDisplayText(parseInfoDisplay(info.roce || formatPercentValue(valuation.roce), "", "%"))],
        ["Face Value", formatInfoDisplayText(parseInfoDisplay(info.faceValue || formatCurrencyValue(valuation.faceValue), "₹", ""))],
        ["52W Range", formatSnapshotRange(info, valuation)]
    ];
}

function estimateCurrency(price, multiplier) {
    const value = Number(price || 1000) * multiplier;
    const sign = value < 0 ? "-" : "";
    return `${sign}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

function renderFinancialSearchResults(term) {
    const results = document.getElementById("financialSearchResults");
    if (!results) {
        return;
    }

    const query = term.trim().toLowerCase();
    if (!query) {
        results.hidden = true;
        results.innerHTML = "";
        return;
    }

    const matches = fullUniverse
        .filter(stock => stock.symbol.toLowerCase().includes(query) || (stock.name || "").toLowerCase().includes(query))
        .slice(0, 8);

    results.hidden = !matches.length;
    results.innerHTML = matches.map(stock => `
        <button type="button" data-financial-symbol="${escapeAttribute(stock.symbol)}">
            <span>${escapeHtml(stock.symbol.replace(".NS", ""))}</span>
            <small>${escapeHtml(stock.name || stock.symbol)}</small>
        </button>
    `).join("");
}

function getRouteFromPath(pathname = window.location.pathname) {
    return pathRoutes[pathname.replace(/\/$/, "") || "/"] || "home";
}

function navigateTo(route, options = {}) {
    const nextRoute = route === "trends" ? "insights" : route;
    const config = routeConfig[nextRoute] || routeConfig.home;

    if (!options.replace && window.location.pathname !== config.path) {
        window.history.pushState({ route: nextRoute }, "", config.path);
    } else if (options.replace && window.location.pathname !== config.path) {
        window.history.replaceState({ route: nextRoute }, "", config.path);
    }

    showExperience(nextRoute, { scroll: options.scroll !== false });
}

function showExperience(type, options = {}) {
    const route = type === "trends" ? "insights" : type;
    const showHome = route === "home";
    const showMarkets = route === "markets";
    const showHeatmap = route === "heatmap";
    const showTrends = route === "insights";
    const showFinancials = route === "financials";
    const shouldScroll = options.scroll !== false;
    activeRoute = route;

    document.body.classList.toggle("experience-open", !showHome);
    document.body.classList.toggle("markets-open", showMarkets);
    document.body.classList.toggle("trends-open", showTrends);
    document.body.classList.toggle("heatmap-open", showHeatmap);
    document.body.classList.toggle("financials-open", showFinancials);
    document.body.classList.add("route-transitioning");
    window.setTimeout(() => document.body.classList.remove("route-transitioning"), 260);

    if (marketsPage) {
        marketsPage.hidden = !showMarkets;
    }
    if (heatmapPanel) {
        heatmapPanel.hidden = !showHeatmap;
    }
    if (trendsPanel) {
        trendsPanel.hidden = !showTrends;
    }
    if (financialStatementsPage) {
        financialStatementsPage.hidden = !showFinancials;
    }

    document.querySelectorAll("[data-route]").forEach(item => {
        item.classList.toggle("active", item.dataset.route === route);
        if (item.dataset.route !== "home") {
            if (item.dataset.route === route) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        }
    });

    if (showMarkets) {
        renderMarketsPage();
    }
    if (showFinancials) {
        renderFinancialPage();
    }
    if (showTrends) {
        renderTrendsExperience();
    }

    if (!shouldScroll) {
        return;
    }

    const target = showHome
        ? document.getElementById("home")
        : showMarkets
            ? marketsPage
            : showFinancials
                ? financialStatementsPage
                : showTrends
                    ? trendsPanel
                    : heatmapPanel;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    syncFilterDropdownOptions();
    const marketScopeSelect = document.getElementById("marketScopeSelect");
    if (marketScopeSelect && Array.from(marketScopeSelect.options).some(option => option.value === currentView)) {
        marketScopeSelect.value = currentView;
    }
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
        const isSectorView = sectorViewKeys.includes(type);
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
    hydrateMarketStatsForScope(currentView);

    if (heatmap) {
        requestAnimationFrame(() => heatmap.classList.remove("is-switching"));
    }
}

function updateMarketFilterControls() {
    syncFilterDropdownOptions();

    document.querySelectorAll("[data-market-filter]").forEach(button => {
        const isActive = button.dataset.marketFilter === activeMarketFilter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const marketFilterSelect = document.getElementById("marketFilterSelect");
    if (marketFilterSelect) {
        marketFilterSelect.value = activeMarketFilter;
    }

    const sectorSelect = document.getElementById("sectorSelect");
    if (sectorSelect) {
        sectorSelect.value = activeSectorFilter;
    }

    const marketScopeSelect = document.getElementById("marketScopeSelect");
    if (marketScopeSelect) {
        marketScopeSelect.value = Array.from(marketScopeSelect.options).some(option => option.value === currentView)
            ? currentView
            : "nifty50";
    }
}

function getTileColorBase(change) {
    const value = Number(change) || 0;
    const abs = Math.min(Math.abs(value), 8);

    // Strong Green Shades
    if (value > 0) {
        if (abs >= 6) {
            return "linear-gradient(135deg, rgba(5,150,105,0.55), rgba(4,120,87,0.68))";
        }

        if (abs >= 4) {
            return "linear-gradient(135deg, rgba(16,185,129,0.42), rgba(5,150,105,0.52))";
        }

        if (abs >= 2) {
            return "linear-gradient(135deg, rgba(52,211,153,0.30), rgba(16,185,129,0.38))";
        }

        return "linear-gradient(135deg, rgba(110,231,183,0.20), rgba(52,211,153,0.26))";
    }

    // Strong Red Shades
    if (value < 0) {
        if (abs >= 6) {
            return "linear-gradient(135deg, rgba(185,28,28,0.55), rgba(127,29,29,0.68))";
        }

        if (abs >= 4) {
            return "linear-gradient(135deg, rgba(220,38,38,0.42), rgba(185,28,28,0.52))";
        }

        if (abs >= 2) {
            return "linear-gradient(135deg, rgba(248,113,113,0.30), rgba(239,68,68,0.38))";
        }

        return "linear-gradient(135deg, rgba(254,202,202,0.20), rgba(248,113,113,0.26))";
    }

    // Neutral
    return "linear-gradient(135deg, rgba(241,245,249,0.88), rgba(226,232,240,0.92))";
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
    const sourceStocks = searchTerm ? fullUniverse : getScopeStocks(currentView);
    let stocks = [...sourceStocks];
    if (!searchTerm && activeSectorFilter !== "all") {
        const sectorSymbols = new Set((fullData[activeSectorFilter] || []).map(stock => stock.symbol));
        stocks = stocks.filter(stock => sectorSymbols.has(stock.symbol));
    }
    let sortedStocks = applyMarketFilter(sortStocksForView(stocks));

    if (searchTerm) {
        sortedStocks = sortedStocks.filter(stock => {
            const symbol = stock.symbol.toLowerCase();
            const name = (stock.name || "").toLowerCase();
            return symbol.includes(searchTerm) || name.includes(searchTerm);
        });
    }

    // ❌ REMOVE shuffle
    return sortedStocks;
}

function getScopeStocks(scope) {
    const allStocks = fullData.all || [];
    const direct = fullData[scope];
    if (Array.isArray(direct) && direct.length) {
        return direct;
    }

    if (sectorViewKeys.includes(scope)) {
        return fullData[scope] || [];
    }

    return allStocks;
}

function applyMarketFilter(stocks) {
    const filteredStocks = [...stocks];
    if (activeMarketFilter === "all") {
        return filteredStocks;
    }

    const capSource = (fullUniverse.length ? fullUniverse : filteredStocks);
    const marketCapValues = capSource
        .map(stock => normalizeMarketCapValue(stock.marketCap))
        .filter(value => value > 0)
        .sort((a, b) => a - b);
    const lowCap = marketCapValues[Math.floor(marketCapValues.length * 0.34)] || 0;
    const highCap = marketCapValues[Math.floor(marketCapValues.length * 0.67)] || 0;

    if (activeMarketFilter === "gainers") {
        return filteredStocks.filter(stock => Number(stock.change || 0) >= 0).sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
    }

    if (activeMarketFilter === "losers") {
        return filteredStocks.filter(stock => Number(stock.change || 0) < 0).sort((a, b) => Number(a.change || 0) - Number(b.change || 0));
    }

    if (activeMarketFilter === "volume") {
        return filteredStocks.sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
    }

    if (activeMarketFilter === "active") {
        return filteredStocks.sort((a, b) => {
            const bActivity = Number(b.volume || 0) * Math.max(Math.abs(Number(b.change || 0)), 0.1);
            const aActivity = Number(a.volume || 0) * Math.max(Math.abs(Number(a.change || 0)), 0.1);
            return bActivity - aActivity;
        });
    }

    if (activeMarketFilter === "momentum") {
        return filteredStocks.sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)));
    }

    if (activeMarketFilter === "gapup") {
        return filteredStocks
            .filter(stock => Number(stock.open || 0) > Number(stock.previousClose || 0))
            .sort((a, b) => {
                const bGap = Number(b.previousClose || 0)
                    ? ((Number(b.open || 0) - Number(b.previousClose || 0)) / Number(b.previousClose || 0)) * 100
                    : 0;
                const aGap = Number(a.previousClose || 0)
                    ? ((Number(a.open || 0) - Number(a.previousClose || 0)) / Number(a.previousClose || 0)) * 100
                    : 0;
                return bGap - aGap;
            });
    }

    if (activeMarketFilter === "gapdown") {
        return filteredStocks
            .filter(stock => Number(stock.open || 0) < Number(stock.previousClose || 0))
            .sort((a, b) => {
                const bGap = Number(b.previousClose || 0)
                    ? ((Number(b.open || 0) - Number(b.previousClose || 0)) / Number(b.previousClose || 0)) * 100
                    : 0;
                const aGap = Number(a.previousClose || 0)
                    ? ((Number(a.open || 0) - Number(a.previousClose || 0)) / Number(a.previousClose || 0)) * 100
                    : 0;
                return aGap - bGap;
            });
    }

    if (activeMarketFilter === "bullish") {
        return filteredStocks
            .filter(stock => Number(stock.change || 0) > 0)
            .sort((a, b) => Number(b.change || 0) - Number(a.change || 0));
    }

    if (activeMarketFilter === "bearish") {
        return filteredStocks
            .filter(stock => Number(stock.change || 0) < 0)
            .sort((a, b) => Number(a.change || 0) - Number(b.change || 0));
    }

    if (activeMarketFilter === "high52") {
        return filteredStocks
            .filter(stock => Number(stock.fiftyTwoWeekHigh || 0) > 0 && Number(stock.price || 0) > 0)
            .sort((a, b) => getDistanceFromHigh52(a) - getDistanceFromHigh52(b));
    }

    if (activeMarketFilter === "low52") {
        return filteredStocks
            .filter(stock => Number(stock.fiftyTwoWeekLow || 0) > 0 && Number(stock.price || 0) > 0)
            .sort((a, b) => getDistanceFromLow52(a) - getDistanceFromLow52(b));
    }

    if (!marketCapValues.length) {
        return filteredStocks;
    }

    if (activeMarketFilter === "largecap") {
        return filteredStocks.filter(stock => normalizeMarketCapValue(stock.marketCap) >= highCap);
    }

    if (activeMarketFilter === "midcap") {
        return filteredStocks.filter(stock => {
            const marketCap = normalizeMarketCapValue(stock.marketCap);
            return marketCap >= lowCap && marketCap < highCap;
        });
    }

    if (activeMarketFilter === "smallcap") {
        return filteredStocks.filter(stock => {
            const marketCap = normalizeMarketCapValue(stock.marketCap);
            return marketCap > 0 && marketCap < lowCap;
        });
    }

    return filteredStocks;
}

function getDistanceFromHigh52(stock) {
    const high = Number(stock.fiftyTwoWeekHigh || 0);
    const price = Number(stock.price || 0);
    if (!high || !price) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.abs((high - price) / high);
}

function getDistanceFromLow52(stock) {
    const low = Number(stock.fiftyTwoWeekLow || 0);
    const price = Number(stock.price || 0);
    if (!low || !price) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.abs((price - low) / low);
}

function normalizeMarketCapValue(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    const text = String(dedupeRepeatedMetricText(value)).replace(/,/g, "").trim();
    const number = Number(text.replace(/\bCr\.?\b/gi, "").trim());
    if (Number.isNaN(number)) {
        return 0;
    }

    return /cr\.?/i.test(text) ? number : number / 10000000;
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

    return stocks.sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)));
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
    heatmap.className = "stock-card-grid premium-treemap";
    viewTitle.textContent = searchTerm ? "Search results" : viewLabels[currentView];
    viewMeta.textContent = buildHeatmapMeta(stocks.length);
    renderHeatmapDescription(stocks.length);

    if (!stocks.length) {
        if (Object.keys(fullData).length) {
            showMessage("No stocks match this view or search.", "");
        }
        return;
    }

    hideMessage();
    renderStocksProgressively(stocks);
    renderIntelligencePanel();
    renderMarketsPage();
    renderTrendsExperience();
    renderFinancialPage();
}

function renderStocksProgressively(stocks) {
    const token = ++heatmapRenderToken;
    const initialBatch = Math.min(stocks.length, getInitialHeatmapBatchSize());
    const chunkSize = 32;
    let rendered = 0;

    const renderChunk = count => {
        const fragment = document.createDocumentFragment();
        const end = Math.min(stocks.length, rendered + count);

        for (let index = rendered; index < end; index += 1) {
            fragment.appendChild(createStockCard(stocks[index], index));
        }

        heatmap.appendChild(fragment);
        hydrateVisibleCardMetrics(stocks.slice(rendered, end));
        rendered = end;
    };

    renderChunk(initialBatch);

    const scheduleNext = () => {
        if (token !== heatmapRenderToken || rendered >= stocks.length) {
            return;
        }

        renderChunk(chunkSize);
        const schedule = window.requestIdleCallback || (callback => window.setTimeout(callback, 32));
        schedule(scheduleNext);
    };

    if (rendered < stocks.length) {
        const schedule = window.requestIdleCallback || (callback => window.setTimeout(callback, 32));
        schedule(scheduleNext);
    }
}

function renderHeatmapSkeleton() {
    if (!heatmap) {
        return;
    }

    heatmapRenderToken += 1;
    const tileCount = getInitialHeatmapBatchSize();
    heatmap.className = "stock-card-grid premium-treemap heatmap-skeleton-grid";
    heatmap.innerHTML = Array.from({ length: tileCount }, (_, index) => `
        <article class="heatmap-skeleton-tile ${index === 0 ? "large" : index <= 3 ? "medium" : "small"}" aria-hidden="true">
            <span></span>
            <strong></strong>
            <em></em>
        </article>
    `).join("");
}

function getInitialHeatmapBatchSize() {
    if (window.innerWidth >= 1500) {
        return 48;
    }

    if (window.innerWidth >= 980) {
        return 36;
    }

    return 24;
}

function buildHeatmapMeta(stockCount) {
    const scope = marketScopeOptions.find(option => option[0] === currentView)?.[1] || viewLabels[currentView] || "Selected market";
    const sector = activeSectorFilter === "all" ? "All sectors" : viewLabels[activeSectorFilter] || activeSectorFilter;
    const filter = activeMarketFilter === "all" ? "Top movers first" : `${marketFilterLabels[activeMarketFilter]} - top movers first`;
    return `${stockCount} ${stockCount === 1 ? "stock" : "stocks"} shown - ${scope} - ${sector} - ${filter}`;
}

function renderHeatmapDescription(stockCount = visibleStocks.length) {
    if (!viewMeta) {
        return;
    }

    let description = document.getElementById("heatmapDescription");
    if (!description) {
        description = document.createElement("div");
        description.id = "heatmapDescription";
        description.className = "heatmap-description";
        viewMeta.insertAdjacentElement("afterend", description);
    }

    const scope = marketScopeOptions.find(option => option[0] === currentView)?.[1] || viewLabels[currentView] || currentView;

    description.innerHTML = `
        <div class="market-summary-inline">
            ${escapeHtml(scope)} • ${escapeHtml(
                activeSectorFilter === "all"
                    ? "All sectors"
                    : viewLabels[activeSectorFilter] || activeSectorFilter
            )} • Ranked by strongest movers
        </div>
    `;
}

function createStockCard(stock, index) {
    const card = document.createElement("article");
    const isPositive = Number(stock.change || 0) >= 0;
    const symbol = stock.symbol.replace(".NS", "");
    const cardSize = getCardSize(stock, index);
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
    card.setAttribute("aria-label", `Select ${stock.name || symbol}`);
    card.title = `${symbol}: ${formatPrice(stock.price)} (${formatChange(stock.change)})`;

    card.innerHTML = `
        ${index === 0 ? `<div class="top-signal-label">${escapeHtml(getTopSignalLabel(stock))}</div>` : ""}
        <div class="stock-card-header">
            <span class="stock-card-name">${escapeHtml(symbol)}</span>
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
            <span>Volume <strong>${formatVolume(stock.volume)}</strong></span>
            <span>Market Cap <strong>${formatMarketCap(stock.marketCap)}</strong></span>
            <span>Relative Strength <strong>${getRelativeStrength(stock)}</strong></span>
            <span>Momentum <strong>${escapeHtml(insight)}</strong></span>
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
        const saturation = 82 + intensity * 8;
        const lightness = 38 - intensity * 10;

        return `hsl(142 ${saturation}% ${lightness}%)`;
    }

    const saturation = 84 + intensity * 8;
    const lightness = 40 - intensity * 10;

    return `hsl(0 ${saturation}% ${lightness}%)`;
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

function getCardSize(stock, index) {
    const isMobile = window.innerWidth <= 640;
    const symbol = (stock?.symbol || "").replace(".NS", "");
    const megaCapSymbols = new Set([
        "RELIANCE",
        "HDFCBANK",
        "TCS",
        "ICICIBANK",
        "INFY",
        "BHARTIARTL",
        "SBIN",
        "LT",
        "ITC",
        "HINDUNILVR",
        "AXISBANK",
        "KOTAKBANK"
    ]);
    const marketCap = normalizeMarketCapValue(stock?.marketCap);
    const isMegaCap = megaCapSymbols.has(symbol) || marketCap >= 900000;

    if (isMobile) {
        if (index === 0 || isMegaCap) return "large";
        if (index <= 3 && getCardIntensity(visibleStocks[index]?.change) >= 0.2) return "medium";
        return "small";
    }

    if (index === 0 || isMegaCap) return "large";
    if (index <= 5 || marketCap >= 450000) return "medium";
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

function getStockSector(stock) {
    const symbol = stock.symbol;
    const sector = getSectorRankings().find(item => (fullData[item.key] || []).some(sectorStock => sectorStock.symbol === symbol));
    return sector ? viewLabels[sector.key] : "NIFTY 50";
}

function getRelativeStrength(stock) {
    const stocks = fullData.all || visibleStocks || [];
    if (!stocks.length) {
        return "--";
    }
    const stronger = stocks.filter(item => Number(item.change || 0) <= Number(stock.change || 0)).length;
    return Math.round((stronger / stocks.length) * 100);
}

function formatVolume(value) {
    const number = Number(value || 0);
    if (!number) {
        return "--";
    }
    if (number >= 10000000) {
        return `${(number / 10000000).toFixed(1)}Cr`;
    }
    if (number >= 100000) {
        return `${(number / 100000).toFixed(1)}L`;
    }
    return number.toLocaleString("en-IN");
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

document.querySelectorAll("[data-hero-action]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.heroAction === "trends" ? "insights" : button.dataset.heroAction);
    });
});

document.querySelectorAll("[data-route]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        navigateTo(link.dataset.route);
    });
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
    const dynamicSectorTrigger = event.target.closest(".toolbar-sector-menu .sector-trigger");
    if (dynamicSectorTrigger) {
        const menu = dynamicSectorTrigger.closest(".sector-menu");
        const isOpen = menu?.classList.toggle("open");
        dynamicSectorTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        event.stopPropagation();
        return;
    }

    const sectorRow = event.target.closest(".sector-row, .toolbar-select[data-view], .toolbar-sector-menu .tab-button");
    if (sectorRow?.dataset.view) {
        activeMarketFilter = "all";
        updateMarketFilterControls();
        loadView(sectorRow.dataset.view);
    }

    const marketFilter = event.target.closest("[data-market-filter]");
    if (marketFilter?.dataset.marketFilter) {
        activeMarketFilter = marketFilter.dataset.marketFilter;
        updateMarketFilterControls();
        renderGrid();
        hydrateMarketStatsForScope(currentView);
    }

    if (event.target.closest("[data-clear-heatmap-filters]")) {
        currentView = "nifty50";
        activeMarketFilter = "all";
        activeSectorFilter = "all";
        updateMarketFilterControls();
        loadView("nifty50");
    }

    const marketIndexRow = event.target.closest("#marketIndexSummary [data-index-view]");
    if (marketIndexRow?.dataset.indexView) {
        loadView(marketIndexRow.dataset.indexView);
        navigateTo("heatmap");
    }

    const trendTab = event.target.closest(".trend-tab");
    if (trendTab?.dataset.trendTab) {
        activeTrendTab = trendTab.dataset.trendTab;
        document.querySelectorAll(".trend-tab").forEach(button => {
            button.classList.toggle("active", button.dataset.trendTab === activeTrendTab);
        });
        renderTrendMovers();
    }

    const intelStock = event.target.closest("[data-symbol]");
    if (intelStock && intelStock.closest(".intelligence-panel, .trend-movers-list")) {
        const stock = getStockBySymbol(intelStock.dataset.symbol);
        if (stock) {
            selectedWorkspaceStock = stock;
            renderIntelligencePanel(stock);
            document.querySelectorAll(".stock-card").forEach(card => {
                card.classList.toggle("selected", card.dataset.symbol === stock.symbol);
            });
        }
    }

    if (event.target.closest("[data-open-trend-analysis]")) {
        navigateTo("insights");
    }

    const financialTab = event.target.closest(".financial-tab");
    if (financialTab?.dataset.financialTab) {
        activeFinancialPageTab = financialTab.dataset.financialTab;
        document.querySelectorAll(".financial-tab").forEach(button => {
            button.classList.toggle("active", button.dataset.financialTab === activeFinancialPageTab);
        });
        renderFinancialPage();
    }

    const financialResult = event.target.closest("[data-financial-symbol]");
    if (financialResult) {
        const stock = getStockBySymbol(financialResult.dataset.financialSymbol);
        if (stock) {
            document.getElementById("financialSearchResults")?.setAttribute("hidden", "");
            selectFinancialStock(stock);
        }
    }

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
            selectedWorkspaceStock = stock;
            renderIntelligencePanel(stock);
        }
    });
}

document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) {
        closeSearchSuggestions();
    }
    if (!event.target.closest(".financial-search-wrap")) {
        document.getElementById("financialSearchResults")?.setAttribute("hidden", "");
    }
});

document.addEventListener("input", event => {
    if (event.target?.id === "financialCompanySearch") {
        renderFinancialSearchResults(event.target.value);
    }
});

document.addEventListener("change", event => {
    if (event.target?.matches("[data-sector-select]")) {
        activeSectorFilter = event.target.value;
        activeMarketFilter = "all";
        updateMarketFilterControls();
        renderGrid();
        hydrateMarketStatsForScope(currentView);
    }

    if (event.target?.matches("[data-market-filter-select]")) {
        activeMarketFilter = event.target.value;
        updateMarketFilterControls();
        renderGrid();
        hydrateMarketStatsForScope(currentView);
    }

    if (event.target?.matches("[data-market-scope-select]")) {
        currentView = event.target.value;
        activeSectorFilter = "all";
        activeMarketFilter = "all";
        updateMarketFilterControls();
        loadView(event.target.value);
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
        selectedWorkspaceStock = stock;
        renderIntelligencePanel(stock);
        document.querySelectorAll(".stock-card").forEach(card => {
            card.classList.toggle("selected", card.dataset.symbol === stock.symbol);
        });
        selectFinancialStock(stock, true);
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
        selectedWorkspaceStock = stock;
        renderIntelligencePanel(stock);
        document.querySelectorAll(".stock-card").forEach(card => {
            card.classList.toggle("selected", card.dataset.symbol === stock.symbol);
        });
        selectFinancialStock(stock, true);
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

window.addEventListener("popstate", () => {
    showExperience(getRouteFromPath(), { scroll: true });
});

window.addEventListener("load", () => {
    setupPremiumExperience();
    prepareStockDetailPage();
    updateMobileHeaderState();
    navigateTo(getRouteFromPath(), { replace: true, scroll: false });
    loadHeatmap();
});

function initializeHeroSlider() {
    const slider = document.querySelector(".hero-slides");
    const dots = document.querySelectorAll(".hero-dots span");

    if (!slider || !dots.length) {
        return;
    }

    const totalSlides = dots.length;
    let currentSlide = 0;

    function updateSlider() {
        slider.style.transform =
            `translateX(-${currentSlide * 100}%)`;

        dots.forEach((dot, index) => {
            dot.classList.toggle(
                "active",
                index === currentSlide
            );
        });
    }

    updateSlider();

    setInterval(() => {
        currentSlide =
            (currentSlide + 1) % totalSlides;

        updateSlider();
    }, 4500);
}

initializeHeroSlider();