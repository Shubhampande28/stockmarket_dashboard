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
const landingStockSearchForm = document.getElementById("landingStockSearchForm");
const landingStockSearch = document.getElementById("landingStockSearch");
const landingSearchSuggestions = document.getElementById("landingSearchSuggestions");
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
            <div class="mkt-page-head">
                <div class="mkt-scope-bar">
                    <div class="mkt-scope-select-wrap">
                        <select class="mkt-scope-select" data-market-scope-select id="mktScopeSelect" aria-label="Market scope">
                            ${marketScopeOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
                        </select>
                        <svg class="mkt-scope-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </div>
                    <div class="mkt-live-stamp">
                        <span class="mkt-live-dot"></span>
                        <span class="mkt-live-text" id="mktLiveTime">Loading…</span>
                    </div>
                </div>
                <h2 class="mkt-overview-title">Market Overview</h2>
                <p class="mkt-overview-sub">Real-time overview of Indian markets</p>
            </div>

            <div class="mkt-metric-row">
                <article class="mkt-metric-card" id="mktCardSentiment">
                    <span class="mkt-metric-eyebrow">MARKET SENTIMENT</span>
                    <div class="mkt-sentiment-body">
                        <div class="mkt-sentiment-icon" id="mktSentimentIcon">
                            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" id="mktSentimentSvg">
                                <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1.5"/>
                                <circle cx="14" cy="16" r="2.5" fill="currentColor"/>
                                <circle cx="26" cy="16" r="2.5" fill="currentColor"/>
                                <path d="M13 26c1.8-3 12.2-3 14 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="mkt-sentiment-text">
                            <strong class="mkt-metric-val" id="mktSentimentVal">--</strong>
                            <p class="mkt-metric-desc" id="mktSentimentDesc">Waiting for data</p>
                        </div>
                        <div class="mkt-sentiment-spark" id="mktSentimentSparkline"></div>
                    </div>
                </article>

                <article class="mkt-metric-card" id="mktCardBreadth">
                    <span class="mkt-metric-eyebrow">MARKET BREADTH</span>
                    <div class="mkt-breadth-nums">
                        <strong class="mkt-breadth-adv" id="mktBreadthAdv">--</strong>
                        <strong class="mkt-breadth-dec" id="mktBreadthDec">--</strong>
                    </div>
                    <div class="mkt-breadth-labels">
                        <span>Advancing</span>
                        <span>Declining</span>
                    </div>
                    <div class="mkt-breadth-bar-wrap">
                        <div class="mkt-breadth-bar-adv" id="mktBreadthFillAdv"></div>
                        <div class="mkt-breadth-bar-dec" id="mktBreadthFillDec"></div>
                    </div>
                    <p class="mkt-metric-desc mkt-ratio-label" id="mktBreadthRatio">Adv/Decl Ratio --</p>
                </article>

                <article class="mkt-metric-card" id="mktCardSector">
                    <span class="mkt-metric-eyebrow">TOP SECTOR</span>
                    <div class="mkt-sector-card-inner">
                        <div class="mkt-sector-icon-wrap" id="mktSectorIconWrap">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4"/></svg>
                        </div>
                        <div>
                            <strong class="mkt-metric-val" id="mktTopSectorName">--</strong>
                            <p class="mkt-sector-chg" id="mktTopSectorChg">--</p>
                            <p class="mkt-metric-desc">Leading Sector</p>
                        </div>
                    </div>
                </article>

                <article class="mkt-metric-card" id="mktCardActive">
                    <span class="mkt-metric-eyebrow">MOST ACTIVE</span>
                    <strong class="mkt-active-symbol" id="mktActiveSymbol">--</strong>
                    <div class="mkt-active-row">
                        <span class="mkt-active-price" id="mktActivePrice">--</span>
                        <span class="mkt-active-chg" id="mktActiveChg">--</span>
                    </div>
                    <p class="mkt-metric-desc" id="mktActiveVol">--</p>
                </article>
            </div>

            <div class="mkt-bottom-grid">
                <article class="mkt-panel mkt-sector-panel">
                    <div class="mkt-panel-hd">
                        <span class="mkt-metric-eyebrow">SECTOR ROTATION</span>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="11" r="0.8" fill="currentColor"/></svg>
                    </div>
                    <div class="mkt-sector-tabs" role="tablist">
                        <button class="mkt-sector-tab active" type="button" data-sector-tab="cap">By Market Cap</button>
                        <button class="mkt-sector-tab" type="button" data-sector-tab="volume">By Volume</button>
                        <button class="mkt-sector-tab" type="button" data-sector-tab="breadth">By Breadth</button>
                    </div>
                    <div class="mkt-sector-body">
                        <div class="mkt-donut-wrap">
                            <svg class="mkt-donut" id="mktDonut" viewBox="0 0 260 260" width="260" height="260" aria-hidden="true"></svg>
                            <div class="mkt-donut-label">
                                <strong>Market</strong>
                                <span>Participation</span>
                                <small id="mktDonutSub">(by Market Cap)</small>
                            </div>
                        </div>
                        <ul class="mkt-sector-list" id="mktSectorList"></ul>
                    </div>
                    <p class="mkt-sector-note">Shows share of total market cap of NIFTY 50</p>
                </article>

                <article class="mkt-panel mkt-breadth-panel">
                    <div class="mkt-panel-hd mkt-panel-hd-row">
                        <span class="mkt-metric-eyebrow">MARKET BREADTH</span>
                        <div class="mkt-time-tabs" role="tablist">
                            <button class="mkt-time-tab active" type="button">1D</button>
                            <button class="mkt-time-tab" type="button">1W</button>
                            <button class="mkt-time-tab" type="button">1M</button>
                            <button class="mkt-time-tab" type="button">1Y</button>
                        </div>
                    </div>
                    <div class="mkt-breadth-gauge-card" aria-label="Market breadth gauge">
                        <div class="mkt-gauge-wrap">
                            <svg class="mkt-gauge-svg" viewBox="0 0 220 132" aria-hidden="true">
                                <path class="mkt-gauge-track" d="M30 112 A80 80 0 0 1 190 112"></path>
                                <path class="mkt-gauge-adv" id="mktGaugeAdvArc" d="M30 112 A80 80 0 0 1 190 112"></path>
                                <path class="mkt-gauge-dec" id="mktGaugeDecArc" d="M30 112 A80 80 0 0 1 190 112"></path>
                            </svg>
                            <div class="mkt-gauge-center">
                                <strong id="mktGaugePct">--</strong>
                                <span>Advancing</span>
                            </div>
                        </div>
                        <div class="mkt-gauge-counts">
                            <div><span>Advances</span><strong class="mkt-gauge-green" id="mktGaugeAdv">--</strong></div>
                            <div><span>Declines</span><strong class="mkt-gauge-red" id="mktGaugeDec">--</strong></div>
                        </div>
                    </div>
                    <div class="mkt-breadth-chart-wrap">
                        <svg class="mkt-breadth-svg" id="mktBreadthSvg" viewBox="0 0 560 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
                        <div class="mkt-chart-labels" id="mktChartLabels"></div>
                        <div class="mkt-y-labels" id="mktYLabels"></div>
                    </div>
                    <div class="mkt-breadth-stats">
                        <div class="mkt-stat-block">
                            <span class="mkt-stat-label mkt-adv-label">ADVANCING</span>
                            <strong class="mkt-stat-val" id="mktStatAdv">--</strong>
                            <span class="mkt-stat-delta mkt-adv-delta" id="mktStatAdvDelta"></span>
                        </div>
                        <div class="mkt-stat-block">
                            <span class="mkt-stat-label mkt-dec-label">DECLINING</span>
                            <strong class="mkt-stat-val" id="mktStatDec">--</strong>
                            <span class="mkt-stat-delta mkt-dec-delta" id="mktStatDecDelta"></span>
                        </div>
                        <div class="mkt-stat-block">
                            <span class="mkt-stat-label">UNCHANGED</span>
                            <strong class="mkt-stat-val" id="mktStatUnch">--</strong>
                            <span class="mkt-stat-delta" id="mktStatUnchDelta"></span>
                        </div>
                    </div>
                </article>
            </div>
            <p class="mkt-page-disclaimer">Data shown is for informational purposes only and may be estimated or delayed. Market breadth, sector metrics, and figures may differ from official NSE/BSE data. This is <strong>not investment advice</strong> — verify with official exchange sources and consult a SEBI-registered advisor before making financial decisions.</p>
        `;
        setupMarketHoverTip();
        setupMktSectorTabs();
        setupMktTimeTabs();
    }

    // Horizontal toolbar replaces the old sector-sidebar + workspace-grid layout
    const heatmapToolbar = document.createElement("div");
    heatmapToolbar.className = "heatmap-toolbar";
    heatmapToolbar.innerHTML = `
        <div class="heatmap-toolbar-item">
            <label class="heatmap-control-label" for="marketScopeSelect">Scope</label>
            <select class="heatmap-control-select compact" id="marketScopeSelect" data-market-scope-select>
                ${marketScopeOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
        </div>
        <div class="heatmap-toolbar-item">
            <label class="heatmap-control-label" for="sectorSelect">Sector</label>
            <select class="heatmap-control-select compact" id="sectorSelect" data-sector-select>
                ${sectorFilterOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
            </select>
        </div>
        <div class="heatmap-toolbar-item">
            <label class="heatmap-control-label" for="marketFilterSelect">Filter</label>
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
        </div>`;

    const heatmapStage = document.createElement("section");
    heatmapStage.className = "heatmap-stage";
    while (heatmapPanel.childNodes.length) {
        heatmapStage.appendChild(heatmapPanel.childNodes[0]);
    }

    intelligencePanel = document.createElement("aside");
    intelligencePanel.className = "intelligence-panel";
    intelligencePanel.id = "intelligencePanel";
    intelligencePanel.setAttribute("aria-label", "Market intelligence");

    // Insert toolbar inside heatmapStage, after panel-heading so filters sit below the title
    const panelHeadingEl = heatmapStage.querySelector(".panel-heading");
    if (panelHeadingEl) {
        panelHeadingEl.insertAdjacentElement("afterend", heatmapToolbar);
    } else {
        heatmapStage.prepend(heatmapToolbar);
    }
    heatmapPanel.appendChild(heatmapStage);
    // sectorPerformanceList removed — renderSectorPerformance exits early when null

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
                <div class="fin-head-top">
                    <p class="workspace-eyebrow">Company Fundamentals</p>
                    <div class="fin-head-right">
                        <a class="annual-report-button" id="annualReportButton" href="#" target="_blank" rel="noopener noreferrer" download hidden>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8m0 0-3-3m3 3 3-3M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            Download Report
                        </a>
                        <span class="fin-trust-badge">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
                            NSE · Screener
                        </span>
                    </div>
                </div>
                <div class="financial-search-wrap fin-search-primary">
                    <svg class="fin-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    <input id="financialCompanySearch" type="search" placeholder="Search company or ticker — e.g. RELIANCE, INFY, TCS" autocomplete="off" aria-label="Search company">
                    <div class="financial-search-results" id="financialSearchResults" hidden></div>
                </div>
            </header>
            <div class="financial-tabs" id="financialTabs" role="tablist" aria-label="Financial statement tabs">
                <button class="financial-tab active" type="button" data-financial-tab="overview">Overview</button>
                <button class="financial-tab" type="button" data-financial-tab="income">Income Statement</button>
                <button class="financial-tab" type="button" data-financial-tab="balance">Balance Sheet</button>
                <button class="financial-tab" type="button" data-financial-tab="cashflow">Cash Flow</button>
                <button class="financial-tab" type="button" data-financial-tab="ratios">Key Ratios</button>
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

function generateSparkline(seed, change, width, height) {
    width = width || 72;
    height = height || 26;
    let s = 0;
    const key = String(seed);
    for (let i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) & 0xffff;
    const n = 12;
    const trend = Number(change || 0) / n;
    let val = 50;
    const values = [];
    for (let i = 0; i < n; i++) {
        s = (s * 1664525 + 1013904223) & 0xffff;
        val += trend * 2.5 + (s / 0xffff - 0.5) * 3;
        values.push(val);
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
        const x = (i / (n - 1)) * width;
        const y = (height - 2) - ((v - min) / range) * (height - 5) + 2;
        return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const color = Number(change || 0) >= 0 ? "#10b981" : "#ef4444";
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" aria-hidden="true"><polyline points="${pts}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/></svg>`;
}

function getStockInsight(change) {
    const c = Number(change || 0);
    const a = Math.abs(c);
    if (a >= 9) return c > 0 ? "Upper circuit" : "Lower circuit";
    if (a >= 6) return c > 0 ? "Momentum breakout" : "Heavy selling";
    if (a >= 3.5) return c > 0 ? "Strong uptrend" : "Sharp decline";
    if (a >= 2) return c > 0 ? "Trending up" : "Trending down";
    if (a >= 1) return c > 0 ? "Mild positive" : "Mild negative";
    return c >= 0 ? "Flat / stable" : "Weak";
}

function computeSentimentPills(stocks) {
    if (!stocks.length) return [];
    const gainers = getRankedGainers([...stocks]);
    const breadthRatio = gainers.length / stocks.length;
    const avgChange = stocks.reduce((s, st) => s + Number(st.change || 0), 0) / stocks.length;
    const absAvg = Math.abs(avgChange);

    const fearGreed = breadthRatio >= 0.65 ? ["Greed", "bullish"]
        : breadthRatio >= 0.52 ? ["Neutral", "neutral"]
        : breadthRatio >= 0.4 ? ["Fear", "bearish"]
        : ["Extreme Fear", "bearish"];

    const momentum = avgChange >= 1.5 ? ["Strong Bullish", "bullish"]
        : avgChange >= 0.4 ? ["Bullish", "bullish"]
        : avgChange >= -0.4 ? ["Neutral", "neutral"]
        : avgChange >= -1.5 ? ["Weak Bearish", "bearish"]
        : ["Bearish", "bearish"];

    const volatility = absAvg >= 1.8 ? ["High", "bearish"]
        : absAvg >= 0.7 ? ["Moderate", "neutral"]
        : ["Low", "bullish"];

    const breadthLabel = breadthRatio >= 0.6 ? ["Strong", "bullish"]
        : breadthRatio >= 0.5 ? ["Moderate", "neutral"]
        : breadthRatio >= 0.38 ? ["Weak", "bearish"]
        : ["Very Weak", "bearish"];

    return [
        { label: "Sentiment", value: fearGreed[0], dot: fearGreed[1] },
        { label: "Momentum", value: momentum[0], dot: momentum[1] },
        { label: "Volatility", value: volatility[0], dot: volatility[1] },
        { label: "Breadth", value: breadthLabel[0], dot: breadthLabel[1] },
        { label: "Advancing", value: `${gainers.length} / ${stocks.length}`, dot: breadthRatio >= 0.5 ? "bullish" : "bearish" }
    ];
}

function setupMarketHoverTip() {
    let tip = document.getElementById("marketHoverTip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "marketHoverTip";
        tip.className = "market-hover-tip";
        document.body.appendChild(tip);
    }

    document.addEventListener("mouseover", function(e) {
        const row = e.target.closest(".market-trending-row[data-symbol]");
        if (!row) return;
        const sym = row.dataset.symbol;
        const stock = (fullData.all || []).find(s => s.symbol === sym);
        if (!stock) return;

        const rows = [
            ["Open", stock.open ? formatRupeePrice(stock.open) : null],
            ["High", stock.high ? formatRupeePrice(stock.high) : null],
            ["Low", stock.low ? formatRupeePrice(stock.low) : null],
            ["Volume", stock.volume ? Number(stock.volume).toLocaleString("en-IN") : null],
            ["VWAP", stock.vwap ? formatRupeePrice(stock.vwap) : null]
        ].filter(([, v]) => v);

        if (!rows.length) return;
        tip.innerHTML = rows.map(([l, v]) =>
            `<div class="market-hover-tip-row"><span class="market-hover-tip-label">${escapeHtml(l)}</span><span class="market-hover-tip-value">${escapeHtml(v)}</span></div>`
        ).join("");
        tip.classList.add("visible");
    });

    document.addEventListener("mousemove", function(e) {
        if (!tip.classList.contains("visible")) return;
        tip.style.left = Math.min(e.clientX + 18, window.innerWidth - 210) + "px";
        tip.style.top = Math.min(e.clientY - 20, window.innerHeight - 200) + "px";
    });

    document.addEventListener("mouseout", function(e) {
        if (e.target.closest(".market-trending-row[data-symbol]") && !e.relatedTarget?.closest(".market-trending-row[data-symbol]")) {
            tip.classList.remove("visible");
        }
    });
}

function renderMarketsPage() {
    if (!marketsPage || marketsPage.hidden) return;

    const stocks = getScopeStocks(currentView);
    const gainers = getRankedGainers([...stocks]);
    const losers = getRankedLosers([...stocks]);
    const unchanged = stocks.filter(s => Math.abs(Number(s.change || 0)) < 0.05);
    const sectors = getSectorRankings();
    const topSector = sectors[0];
    const breadthRatio = stocks.length ? gainers.length / stocks.length : 0;
    const mostActive = [...stocks].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))[0] || gainers[0];
    const topSectorChange = topSector ? Number(topSector.average || 0) : 0;
    const topSectorIsPos = topSectorChange >= 0;
    const topSectorName = topSector ? (viewLabels[topSector.key] || topSector.key) : "--";
    const avgChange = stocks.length ? stocks.reduce((s, st) => s + Number(st.change || 0), 0) / stocks.length : 0;
    const isBullish = breadthRatio >= 0.5;

    // Live timestamp
    const liveTimeEl = document.getElementById("mktLiveTime");
    if (liveTimeEl) {
        const now = new Date();
        liveTimeEl.textContent = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            + ", " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST";
    }

    // Sync scope select with currentView
    const mktScopeSelect = document.getElementById("mktScopeSelect");
    if (mktScopeSelect && mktScopeSelect.value !== currentView) {
        mktScopeSelect.value = currentView;
    }

    // --- Sentiment card ---
    const sentimentVal = document.getElementById("mktSentimentVal");
    const sentimentDesc = document.getElementById("mktSentimentDesc");
    const sentimentIcon = document.getElementById("mktSentimentSvg");
    const sentimentSpark = document.getElementById("mktSentimentSparkline");
    const cardSentiment = document.getElementById("mktCardSentiment");

    if (sentimentVal && stocks.length) {
        const label = breadthRatio >= 0.65 ? "Bullish"
            : breadthRatio >= 0.52 ? "Neutral"
            : breadthRatio >= 0.4 ? "Bearish"
            : "Bearish";
        const desc = breadthRatio >= 0.52 ? "Risk-On Session" : "Risk-Off Session";
        sentimentVal.textContent = label;
        sentimentVal.className = "mkt-metric-val " + (isBullish ? "mkt-val-gain" : "mkt-val-loss");
        if (sentimentDesc) sentimentDesc.textContent = desc;
        if (cardSentiment) cardSentiment.dataset.sentiment = isBullish ? "bull" : "bear";

        // Flip bear/bull face
        if (sentimentIcon && !isBullish) {
            // Bear face — frown down
            sentimentIcon.querySelector("path").setAttribute("d", "M13 28c1.8 3 12.2 3 14 0");
        } else if (sentimentIcon) {
            sentimentIcon.querySelector("path").setAttribute("d", "M13 26c1.8-3 12.2-3 14 0");
        }

        // Mini sparkline (SVG line representing avg change trend)
        if (sentimentSpark) {
            sentimentSpark.innerHTML = buildMiniSparklineSvg(avgChange, isBullish);
        }
    }

    // --- Breadth card ---
    const breadthAdv = document.getElementById("mktBreadthAdv");
    const breadthDec = document.getElementById("mktBreadthDec");
    const breadthFillAdv = document.getElementById("mktBreadthFillAdv");
    const breadthFillDec = document.getElementById("mktBreadthFillDec");
    const breadthRatioEl = document.getElementById("mktBreadthRatio");
    if (breadthAdv && stocks.length) {
        const total = gainers.length + losers.length || 1;
        const advPct = Math.round((gainers.length / total) * 100);
        const decPct = 100 - advPct;
        breadthAdv.textContent = gainers.length.toLocaleString("en-IN");
        if (breadthDec) breadthDec.textContent = losers.length.toLocaleString("en-IN");
        if (breadthFillAdv) breadthFillAdv.style.width = advPct + "%";
        if (breadthFillDec) breadthFillDec.style.width = decPct + "%";
        if (breadthRatioEl) {
            const ratio = losers.length ? (gainers.length / losers.length).toFixed(2) : "∞";
            breadthRatioEl.textContent = "Adv/Decl Ratio " + ratio;
        }
    }

    // --- Top Sector card ---
    const topSectorNameEl = document.getElementById("mktTopSectorName");
    const topSectorChgEl = document.getElementById("mktTopSectorChg");
    const sectorIconWrap = document.getElementById("mktSectorIconWrap");
    if (topSectorNameEl) {
        topSectorNameEl.textContent = topSectorName;
        if (topSectorChgEl) {
            topSectorChgEl.textContent = topSector ? formatChange(topSector.average) : "--";
            topSectorChgEl.className = "mkt-sector-chg " + (topSectorIsPos ? "mkt-val-gain" : "mkt-val-loss");
        }
        if (sectorIconWrap) sectorIconWrap.style.color = topSectorIsPos ? "#22c55e" : "#ef4444";
    }

    // --- Most Active card ---
    const activeSymbol = document.getElementById("mktActiveSymbol");
    const activePrice = document.getElementById("mktActivePrice");
    const activeChg = document.getElementById("mktActiveChg");
    const activeVol = document.getElementById("mktActiveVol");
    if (activeSymbol && mostActive) {
        const sym = mostActive.symbol.replace(".NS", "");
        const chgNum = Number(mostActive.change || 0);
        const isPos = chgNum >= 0;
        activeSymbol.textContent = escapeHtml(sym);
        if (activePrice) activePrice.textContent = formatRupeePrice(mostActive.price);
        if (activeChg) {
            activeChg.textContent = formatChange(mostActive.change);
            activeChg.className = "mkt-active-chg " + (isPos ? "mkt-val-gain" : "mkt-val-loss");
        }
        if (activeVol && mostActive.volume) {
            const vol = Number(mostActive.volume);
            const volStr = vol >= 1e7 ? (vol / 1e7).toFixed(2) + "M" : vol >= 1e5 ? (vol / 1e5).toFixed(1) + "L" : vol.toLocaleString("en-IN");
            activeVol.textContent = "Volume " + volStr;
        }
    }

    // --- Sector Donut Chart ---
    const donut = document.getElementById("mktDonut");
    const sectorList = document.getElementById("mktSectorList");
    if (donut) {
        const activeTab = document.querySelector(".mkt-sector-tab.active")?.dataset?.sectorTab || "cap";
        renderDonutAndList(activeTab);
    }

    // --- Market Breadth Line Chart ---
    const breadthSvg = document.getElementById("mktBreadthSvg");
    if (breadthSvg && stocks.length) {
        renderBreadthChart(breadthSvg, gainers.length, losers.length, stocks.length);
    }

    // --- Bottom stats ---
    const statAdv = document.getElementById("mktStatAdv");
    const statDec = document.getElementById("mktStatDec");
    const statUnch = document.getElementById("mktStatUnch");
    updateMarketBreadthGauge(gainers.length, losers.length, stocks.length);
    if (statAdv && stocks.length) {
        statAdv.textContent = gainers.length.toLocaleString("en-IN");
        if (statDec) statDec.textContent = losers.length.toLocaleString("en-IN");
        if (statUnch) statUnch.textContent = unchanged.length.toLocaleString("en-IN");

        const advDelta = document.getElementById("mktStatAdvDelta");
        const decDelta = document.getElementById("mktStatDecDelta");
        const unchDelta = document.getElementById("mktStatUnchDelta");
        if (advDelta) {
            const pct = stocks.length ? Math.round((gainers.length / stocks.length) * 100) : 0;
            advDelta.textContent = "+" + gainers.length + " (+" + pct + "%)";
        }
        if (decDelta) {
            const pct = stocks.length ? Math.round((losers.length / stocks.length) * 100) : 0;
            decDelta.textContent = "-" + losers.length + " (-" + pct + "%)";
        }
        if (unchDelta) {
            const pct = stocks.length ? Math.round((unchanged.length / stocks.length) * 100) : 0;
            unchDelta.textContent = "-" + unchanged.length + " (-" + pct + "%)";
        }
    }
}

function updateMarketBreadthGauge(advancing, declining, total) {
    const gaugeAdv = document.getElementById("mktGaugeAdv");
    const gaugeDec = document.getElementById("mktGaugeDec");
    const gaugePct = document.getElementById("mktGaugePct");
    const advArc = document.getElementById("mktGaugeAdvArc");
    const decArc = document.getElementById("mktGaugeDecArc");
    const activeTotal = advancing + declining;

    if (!gaugeAdv || !gaugeDec || !gaugePct || !advArc || !decArc || !total || !activeTotal) {
        return;
    }

    const advPct = Math.max(0, Math.min(100, (advancing / activeTotal) * 100));
    const decPct = 100 - advPct;
    gaugeAdv.textContent = advancing.toLocaleString("en-IN");
    gaugeDec.textContent = declining.toLocaleString("en-IN");
    gaugePct.textContent = `${Math.round(advPct)}%`;
    advArc.style.strokeDasharray = `${advPct} ${100 - advPct}`;
    decArc.style.strokeDasharray = `${decPct} ${100 - decPct}`;
}

function buildMiniSparklineSvg(avgChange, isPos) {
    const W = 80, H = 40;
    const points = 12;
    const pts = [];
    for (let i = 0; i < points; i++) {
        const progress = i / (points - 1);
        const noise = (Math.sin(i * 2.3) * 0.3 + Math.cos(i * 1.7) * 0.2);
        const y = H / 2 - progress * (avgChange * 4) + noise * H * 0.15;
        pts.push([i * (W / (points - 1)), Math.max(2, Math.min(H - 2, y))]);
    }
    const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const color = isPos ? "#22c55e" : "#ef4444";
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function buildDonutSectors(tabType = "cap") {
    const sectorGroups = [
        { name: "Financial Services", keys: ["bank", "finance"], color: "#3b82f6" },
        { name: "Information Technology", keys: ["it"], color: "#8b5cf6" },
        { name: "Energy", keys: ["energy"], color: "#f97316" },
        { name: "Automobile", keys: ["auto"], color: "#f59e0b" },
        { name: "FMCG", keys: ["fmcg", "consumer"], color: "#14b8a6" },
        { name: "Healthcare", keys: ["pharma"], color: "#ec4899" },
        { name: "Others", keys: ["metal", "realty", "telecom", "infra", "psu", "cement", "chemicals", "media"], color: "#94a3b8" }
    ];

    // Build a set of symbols in the current scope for filtering
    const scopeStocks = getScopeStocks(currentView);
    const scopeSet = scopeStocks.length ? new Set(scopeStocks.map(s => s.symbol)) : null;

    const result = sectorGroups.map(g => {
        let allStocks = g.keys.flatMap(k => fullData[k] || []);
        if (scopeSet) allStocks = allStocks.filter(s => scopeSet.has(s.symbol));
        if (!allStocks.length) allStocks = g.keys.flatMap(k => fullData[k] || []);

        const count = allStocks.length || 0;
        const volume = allStocks.reduce((s, st) => s + Number(st.volume || 0), 0);
        const gainers = allStocks.filter(st => Number(st.change || 0) > 0).length;
        const breadthScore = count > 0 ? (gainers / count) * 100 : 0;
        const change = count > 0
            ? allStocks.reduce((s, st) => s + Number(st.change || 0), 0) / count
            : 0;

        const weight = tabType === "volume" ? (volume || 1)
            : tabType === "breadth" ? (breadthScore || 0.1)
            : (count || 1);

        return { name: g.name, color: g.color, count, change, weight, breadthScore, volume };
    });

    const total = result.reduce((s, r) => s + r.weight, 0) || 1;
    return result
        .map(r => ({ ...r, pct: (r.weight / total) * 100 }))
        .sort((a, b) => b.pct - a.pct);
}

function renderDonutAndList(tabType = "cap") {
    const donut = document.getElementById("mktDonut");
    const sectorList = document.getElementById("mktSectorList");
    const donutSub = document.getElementById("mktDonutSub");
    if (!donut) return;

    const labels = { cap: "(by Market Cap)", volume: "(by Volume)", breadth: "(by Breadth)" };
    if (donutSub) donutSub.textContent = labels[tabType] || "";

    const sectors = buildDonutSectors(tabType);
    renderMktDonut(donut, sectors);

    if (sectorList) {
        sectorList.innerHTML = sectors.map(s => {
            const chgLabel = tabType === "breadth"
                ? s.breadthScore.toFixed(1) + "% adv"
                : (tabType === "volume"
                    ? (s.volume >= 1e9 ? (s.volume / 1e9).toFixed(1) + "B" : s.volume >= 1e6 ? (s.volume / 1e6).toFixed(0) + "M" : s.volume.toFixed(0))
                    : ((s.change >= 0 ? "+" : "") + s.change.toFixed(2) + "%"));
            const chgClass = tabType === "breadth"
                ? (s.breadthScore >= 50 ? "mkt-val-gain" : "mkt-val-loss")
                : (s.change >= 0 ? "mkt-val-gain" : "mkt-val-loss");
            return `
                <li class="mkt-sector-row">
                    <span class="mkt-sector-dot" style="background:${s.color}"></span>
                    <span class="mkt-sector-name">${escapeHtml(s.name)}</span>
                    <span class="mkt-sector-pct">${s.pct.toFixed(1)}%</span>
                    <span class="mkt-sector-chg-val ${chgClass}">${escapeHtml(chgLabel)}</span>
                </li>`;
        }).join("");
    }
}

function renderMktDonut(svgEl, sectors) {
    const CX = 130, CY = 130, R = 110, r = 70, GAP = 0.022;
    let angle = -Math.PI / 2;
    const paths = sectors.map((sec, idx) => {
        const sweep = (sec.pct / 100) * (2 * Math.PI) - GAP;
        if (sweep <= 0) return "";
        const x1 = CX + R * Math.cos(angle);
        const y1 = CY + R * Math.sin(angle);
        const endA = angle + sweep;
        const x2 = CX + R * Math.cos(endA);
        const y2 = CY + R * Math.sin(endA);
        const ix1 = CX + r * Math.cos(endA);
        const iy1 = CY + r * Math.sin(endA);
        const ix2 = CX + r * Math.cos(angle);
        const iy2 = CY + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const d = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix1.toFixed(2)} ${iy1.toFixed(2)} A${r} ${r} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z`;
        angle += sweep + GAP;
        return `<path d="${d}" fill="${sec.color}" class="mkt-donut-seg" style="--seg-delay:${idx * 80}ms"/>`;
    });
    svgEl.innerHTML = paths.join("");
}

function renderBreadthChart(svgEl, advCount, decCount, total) {
    const W = 560, H = 210;
    // 13 time slots: 9:15 AM to 3:30 PM every 30 min
    const timeLabels = ["9:15", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30"];
    const N = timeLabels.length;
    const totalActive = advCount + decCount || 1;

    // Realistic intraday simulation:
    // Market opens near neutral, trends toward session end values
    // Morning is more volatile, afternoon stabilises
    const startRatio = 0.5 + (advCount / totalActive - 0.5) * 0.08; // Open near 50% with slight bias
    const endRatio = advCount / totalActive;
    const advRaw = [], decRaw = [];

    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        // Ease-in: slow start, accelerate, settle
        const trend = Math.pow(t, 0.65);
        const ratio = startRatio + (endRatio - startRatio) * trend;
        // Morning volatility decreases through day
        const vol = Math.sin(i * 1.8) * (1 - t * 0.7) * totalActive * 0.025;
        const adv = Math.round(totalActive * ratio + vol);
        advRaw.push(Math.max(5, Math.min(totalActive - 5, adv)));
        decRaw.push(totalActive - advRaw[i]);
    }

    // Catmull-Rom cubic bezier
    const smoothPath = (coords) => {
        if (coords.length < 2) return "";
        let d = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[Math.max(0, i - 1)];
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const p3 = coords[Math.min(coords.length - 1, i + 2)];
            const cp1x = p1[0] + (p2[0] - p0[0]) / 4.5;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 4.5;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 4.5;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 4.5;
            d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        }
        return d;
    };

    const maxVal = Math.max(...advRaw, ...decRaw) * 1.18;
    const PAD_L = 46, PAD_R = 70, PAD_T = 18, PAD_B = 30;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const baseY = PAD_T + chartH;

    const toCoords = (vals) => vals.map((v, i) => [
        PAD_L + (i / (N - 1)) * chartW,
        PAD_T + chartH - (v / maxVal) * chartH
    ]);

    const advCoords = toCoords(advRaw);
    const decCoords = toCoords(decRaw);

    const areaPath = (coords) => {
        const line = smoothPath(coords);
        const last = coords[coords.length - 1];
        return `${line} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${coords[0][0].toFixed(1)},${baseY.toFixed(1)} Z`;
    };

    // Y gridlines — clean 4-step scale
    const yGridLines = [0, 0.25, 0.5, 0.75, 1.0].map(frac => {
        const v = Math.round(maxVal * frac);
        const y = PAD_T + chartH - (v / maxVal) * chartH;
        const label = v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
        return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.8"/>
                <text x="${(PAD_L - 6).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${label}</text>`;
    }).join("");

    // X axis: only show every 2nd label to avoid crowding
    const xLabels = timeLabels.map((label, i) => {
        if (i % 2 !== 0 && i !== N - 1) return "";
        const x = PAD_L + (i / (N - 1)) * chartW;
        return `<text x="${x.toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle" font-size="9" fill="#94a3b8">${label}</text>`;
    }).join("");

    // End labels on right side of lines
    const advEndX = advCoords[advCoords.length - 1][0] + 6;
    const advEndY = advCoords[advCoords.length - 1][1] + 4;
    const decEndX = decCoords[decCoords.length - 1][0] + 6;
    const decEndY = decCoords[decCoords.length - 1][1] + 4;

    svgEl.innerHTML = `
        <defs>
            <linearGradient id="advG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#16a34a" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#16a34a" stop-opacity="0.01"/>
            </linearGradient>
            <linearGradient id="decG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#dc2626" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#dc2626" stop-opacity="0.01"/>
            </linearGradient>
        </defs>
        ${yGridLines}
        <path d="${areaPath(advCoords)}" fill="url(#advG)"/>
        <path d="${areaPath(decCoords)}" fill="url(#decG)"/>
        <path d="${smoothPath(advCoords)}" fill="none" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${smoothPath(decCoords)}" fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${advEndX.toFixed(1)}" y="${advEndY.toFixed(1)}" font-size="9.5" font-weight="600" fill="#16a34a">▲ ${advCount}</text>
        <text x="${decEndX.toFixed(1)}" y="${decEndY.toFixed(1)}" font-size="9.5" font-weight="600" fill="#dc2626">▼ ${decCount}</text>
        ${xLabels}
    `;
}

function setupMktSectorTabs() {
    document.addEventListener("click", e => {
        const tab = e.target.closest("[data-sector-tab]");
        if (!tab) return;
        tab.closest(".mkt-sector-tabs")?.querySelectorAll(".mkt-sector-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderDonutAndList(tab.dataset.sectorTab || "cap");
    });
}

function setupMktTimeTabs() {
    document.addEventListener("click", e => {
        const tab = e.target.closest(".mkt-time-tab");
        if (!tab) return;
        tab.closest(".mkt-time-tabs")?.querySelectorAll(".mkt-time-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
    });
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
        ["Most Active Stock", mostActive ? mostActive.symbol.replace(".NS", "") : "--", mostActive ? formatRupeePrice(mostActive.price) : "Waiting"],
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
            <strong>${formatRupeePrice(stock.price)}</strong>
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
        const isGain = Number(stock.change || 0) >= 0;
        const avatarText = symbol.slice(0, 2);
        const stockSector = getStockSector(stock.symbol);

        const mktCap = formatSnapshotMarketCap(info, valuation);
        const currentPrice = formatCompactPrice(stock.price);
        const peRatio = formatSnapshotRatio(info.stockPe, valuation.peTrailing);
        const roeVal = parseInfoDisplay(info.roe || formatPercentValue(valuation.roe), "", "%");
        const roceVal = parseInfoDisplay(info.roce || formatPercentValue(valuation.roce), "", "%");

        const peNum = parseFloat(info.stockPe || valuation.peTrailing || 0);
        const peMax = Math.max(peNum * 1.5, 50);
        const pePct = peNum ? Math.min((peNum / peMax) * 100, 100) : 0;
        const roeNum = parseFloat(info.roe || valuation.roe || 0);
        const roePct = roeNum ? Math.min((roeNum / 30) * 100, 100) : 0;
        const roceNum = parseFloat(info.roce || valuation.roce || 0);
        const rocePct = roceNum ? Math.min((roceNum / 30) * 100, 100) : 0;

        const sourceText = [data.source?.provider, data.source?.label].filter(Boolean).join(" · ") || "Screener.in";
        const sourceUrl = data.source?.url || "";
        const annualReport = data.source?.annualReport;
        const sourceNote = data.sourceNote || "Figures in INR crore where available";
        const sparkColor = isGain ? "#16a34a" : "#dc2626";
        const spark = generateDecorativeSparkline(isGain);

        financialContent.innerHTML = `
            <div class="fin-company-row">
                <div class="fin-company-identity">
                    <div class="fin-avatar">${escapeHtml(avatarText)}</div>
                    <div class="fin-company-info">
                        <h3 class="fin-company-name">${escapeHtml(data.name || stock.name || symbol)}</h3>
                        <div class="fin-company-tags">
                            <span class="fin-tag">${escapeHtml(symbol)}</span>
                            <span class="fin-tag">NSE</span>
                            ${stockSector ? `<span class="fin-tag">${escapeHtml(stockSector)}</span>` : ""}
                        </div>
                    </div>
                </div>
                <div class="fin-company-price">
                    <strong class="fin-price-val">${escapeHtml(currentPrice)}</strong>
                    <span class="fin-price-chg ${isGain ? "fin-gain" : "fin-loss"}">${escapeHtml(formatChange(stock.change))}</span>
                </div>
            </div>

            <div class="fin-metric-grid">
                <article class="fin-metric-card fin-metric-primary">
                    <div class="fin-metric-eyebrow">Market Cap</div>
                    <div class="fin-metric-value">${escapeHtml(mktCap)}</div>
                    <svg class="fin-sparkline" viewBox="0 0 120 40" preserveAspectRatio="none" fill="none" aria-hidden="true">
                        <defs>
                            <linearGradient id="finSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="${sparkColor}" stop-opacity="0.3"/>
                                <stop offset="100%" stop-color="${sparkColor}" stop-opacity="0.02"/>
                            </linearGradient>
                        </defs>
                        <path d="${spark.area}" fill="url(#finSparkGrad)"/>
                        <path d="${spark.line}" stroke="${sparkColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </article>

                <article class="fin-metric-card fin-metric-secondary">
                    <div class="fin-metric-eyebrow">P/E Ratio</div>
                    <div class="fin-metric-value">${escapeHtml(peRatio)}</div>
                    ${peNum ? `<div class="fin-benchmark">
                        <div class="fin-benchmark-bar"><div class="fin-benchmark-fill" style="width:${pePct.toFixed(1)}%"></div></div>
                        <span class="fin-benchmark-label">Nifty avg ~22×</span>
                    </div>` : ""}
                </article>

                <article class="fin-metric-card fin-metric-secondary">
                    <div class="fin-metric-eyebrow">ROE</div>
                    <div class="fin-metric-value ${roeNum >= 15 ? "fin-val-good" : roeNum > 0 ? "fin-val-ok" : ""}">${escapeHtml(formatInfoDisplayText(roeVal))}</div>
                    ${roeNum ? `<div class="fin-benchmark">
                        <div class="fin-benchmark-bar"><div class="fin-benchmark-fill${roeNum >= 15 ? " fin-benchmark-good" : ""}" style="width:${roePct.toFixed(1)}%"></div></div>
                        <span class="fin-benchmark-label">Good &gt; 15%</span>
                    </div>` : ""}
                </article>

                <article class="fin-metric-card fin-metric-secondary">
                    <div class="fin-metric-eyebrow">ROCE</div>
                    <div class="fin-metric-value ${roceNum >= 15 ? "fin-val-good" : roceNum > 0 ? "fin-val-ok" : ""}">${escapeHtml(formatInfoDisplayText(roceVal))}</div>
                    ${roceNum ? `<div class="fin-benchmark">
                        <div class="fin-benchmark-bar"><div class="fin-benchmark-fill${roceNum >= 15 ? " fin-benchmark-good" : ""}" style="width:${rocePct.toFixed(1)}%"></div></div>
                        <span class="fin-benchmark-label">Good &gt; 15%</span>
                    </div>` : ""}
                </article>
            </div>

            <div class="fin-source-strip">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
                <span>Data: ${sourceUrl ? `<a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceText)}</a>` : escapeHtml(sourceText)}</span>
                <span class="fin-source-sep">·</span>
                <span>${escapeHtml(sourceNote)}</span>
                ${annualReport?.url ? `<span class="fin-source-sep">·</span><a href="${escapeAttribute(annualReport.url)}" target="_blank" rel="noopener noreferrer" class="fin-source-link">Annual Report ${escapeHtml(String(annualReport.year || ""))}</a>` : ""}
            </div>

            <div class="fin-page-disclaimer">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5L1.5 13.5h13L8 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><line x1="8" y1="6.5" x2="8" y2="10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.65" fill="currentColor"/></svg>
                <span>Financial figures sourced from third-party providers (Screener.in, Yahoo Finance) and may differ from company filings. Numbers are in INR crore unless stated. This is <strong>not investment advice</strong> — always verify with official company annual reports, NSE/BSE filings, and consult a SEBI-registered advisor before making investment decisions.</span>
            </div>

            <div class="financial-page-news" id="financialPageNews">
                <div class="financial-page-news-head">
                    <h3>Latest News</h3>
                    <p id="financialPageNewsMeta">Loading headlines...</p>
                </div>
                <div class="fin-news-grid" id="financialPageNewsList">
                    <article class="fin-news-card">
                        <p class="fin-news-headline">Fetching latest headlines for ${escapeHtml(symbol)}…</p>
                    </article>
                </div>
            </div>
        `;
        loadFinancialPageNews(stock);
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

function getStockSector(symbol) {
    const sectorNames = {
        auto: "Auto", bank: "Banking", energy: "Energy", fmcg: "FMCG",
        healthcare: "Healthcare", it: "IT", media: "Media", metal: "Metal",
        pharma: "Pharma", realty: "Realty", midcap: "Midcap", nifty50: "Nifty 50"
    };
    for (const key of sectorViewKeys) {
        if (fullData[key]?.some(s => s.symbol === symbol)) {
            return sectorNames[key] || null;
        }
    }
    return null;
}

function generateDecorativeSparkline(isGain) {
    const w = 120, h = 40, pts = 10;
    const points = [];
    for (let i = 0; i < pts; i++) {
        const t = i / (pts - 1);
        const trend = isGain ? -t * h * 0.5 : t * h * 0.5;
        const noise = (Math.sin(i * 2.1) + Math.cos(i * 1.6)) * h * 0.07;
        const y = Math.max(4, Math.min(h - 4, h * (isGain ? 0.72 : 0.28) + trend + noise));
        points.push({ x: (t * w), y });
    }
    const line = points.map((p, i) => {
        if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        const prev = points[i - 1];
        const next = points[Math.min(i + 1, pts - 1)];
        const pprev = points[Math.max(i - 2, 0)];
        const cp1x = prev.x + (p.x - pprev.x) / 6;
        const cp1y = prev.y + (p.y - pprev.y) / 6;
        const cp2x = p.x - (next.x - prev.x) / 6;
        const cp2y = p.y - (next.y - prev.y) / 6;
        return `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");
    const last = points[pts - 1];
    const area = `${line} L${last.x.toFixed(1)},${h} L0,${h} Z`;
    return { line, area };
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

    window.scrollTo({ top: 0, behavior: "smooth" });
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

function openIndexHeatmap(indexView) {
    if (!indexView) {
        return;
    }

    loadView(indexView);
    navigateTo("heatmap");
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
    if (viewMeta) { viewMeta.textContent = ""; }

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

    const maxGain = stocks.reduce((m, s) => Math.max(m, Number(s.change || 0)), 0) || 1;
    const maxLoss = stocks.reduce((m, s) => Math.max(m, -Number(s.change || 0)), 0) || 1;

    const renderChunk = count => {
        const fragment = document.createDocumentFragment();
        const end = Math.min(stocks.length, rendered + count);

        for (let index = rendered; index < end; index += 1) {
            fragment.appendChild(createStockCard(stocks[index], index, maxGain, maxLoss));
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

function createStockCard(stock, index, maxGain = 10, maxLoss = 10) {
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
    const relativeMax = isPositive ? maxGain : maxLoss;
    const intensity = getCardIntensity(stock.change, relativeMax);
    const cardBg = getTileBackground(isPositive, intensity);
    const darkTile = intensity > 0.38;
    const shadowOpacity = 0.08 + intensity * 0.18;
    const movementColor = getMovementAccent(stock.change, isPositive, relativeMax);
    card.style.setProperty("--mount-delay", `${Math.min(index, 18) * 38}ms`);
    card.style.setProperty("--move-intensity", intensity.toFixed(2));
    card.style.setProperty("--card-bg", cardBg);
    card.style.setProperty("--card-text", darkTile ? "#ffffff" : "#111827");
    card.style.setProperty("--card-gain-text", darkTile ? "rgba(255,255,255,0.92)" : "#16a34a");
    card.style.setProperty("--card-loss-text", darkTile ? "rgba(255,255,255,0.92)" : "#dc2626");
    card.style.setProperty("--card-shadow-y", `${(6 + intensity * 14).toFixed(1)}px`);
    card.style.setProperty("--card-shadow-blur", `${(14 + intensity * 22).toFixed(1)}px`);
    card.style.setProperty("--card-hover-y", `${(10 + intensity * 18).toFixed(1)}px`);
    card.style.setProperty("--card-hover-blur", `${(22 + intensity * 26).toFixed(1)}px`);
    card.style.setProperty("--card-border", movementColor);
    card.style.setProperty("--change-color", darkTile ? "rgba(255,255,255,0.95)" : movementColor);
    card.style.setProperty("--card-shadow", isPositive ? `rgba(22, 163, 74, ${shadowOpacity.toFixed(3)})` : `rgba(220, 38, 38, ${shadowOpacity.toFixed(3)})`);
    card.setAttribute("aria-label", `Select ${stock.name || symbol}`);
    card.title = `${symbol}: ${formatRupeePrice(stock.price)} (${formatChange(stock.change)})`;

    const textColor = darkTile ? "#ffffff" : "#111827";
    const changeTextColor = darkTile ? "#ffffff" : (isPositive ? "#16a34a" : "#dc2626");
    const secondaryTextColor = darkTile ? "rgba(255,255,255,0.72)" : "#475569";

    card.innerHTML = `
        ${index === 0 ? `<div class="top-signal-label">${escapeHtml(getTopSignalLabel(stock))}</div>` : ""}
        <div class="stock-card-header">
            <span class="stock-card-name" style="color:${textColor}">${escapeHtml(symbol)}</span>
        </div>
        <div class="stock-card-price-row">
            <strong style="color:${textColor}">${formatRupeePrice(stock.price)}</strong>
            <span class="stock-card-change ${isPositive ? "gain" : "loss"}" style="color:${changeTextColor}!important;opacity:1">
                ${formatChange(stock.change)}
            </span>
        </div>
        <div class="stock-card-insight-inline">
            <span class="insight-label" style="color:${secondaryTextColor}">
                ${isPositive ? "🔥" : "⚠"} ${escapeHtml(insight)}
            </span>
            <span class="insight-trend ${isPositive ? "gain" : "loss"}" style="color:${secondaryTextColor}">
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

function getCardIntensity(change, max = 10) {
    const value = Math.abs(Number(change) || 0);
    return Math.min(value / Math.max(max, 0.01), 1);
}

function getMovementAccent(change, isPositive, max = 10) {
    const intensity = getCardIntensity(change, max);

    if (isPositive) {
        const saturation = 75 + intensity * 15;
        const lightness = 46 - intensity * 20;

        return `hsl(142 ${saturation}% ${lightness}%)`;
    }

    const saturation = 77 + intensity * 15;
    const lightness = 48 - intensity * 20;

    return `hsl(0 ${saturation}% ${lightness}%)`;
}

function getTileBackground(isPositive, intensity) {
    const lightness = Math.round(96 - intensity * 58);
    const saturation = Math.round(18 + intensity * 62);
    const hue = isPositive ? 142 : 0;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
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

function getStockSearchMatches(term, limit = 8) {
    const normalizedTerm = String(term || "").trim().toLowerCase();
    if (!normalizedTerm) {
        return [];
    }

    return fullUniverse
        .filter(stock => {
            const symbol = stock.symbol.toLowerCase();
            const cleanSymbol = stock.symbol.replace(".NS", "").toLowerCase();
            const name = (stock.name || "").toLowerCase();
            return symbol.includes(normalizedTerm) || cleanSymbol.includes(normalizedTerm) || name.includes(normalizedTerm);
        })
        .sort((a, b) => {
            const aSymbol = a.symbol.replace(".NS", "").toLowerCase();
            const bSymbol = b.symbol.replace(".NS", "").toLowerCase();
            const aName = (a.name || "").toLowerCase();
            const bName = (b.name || "").toLowerCase();
            const aStarts = aSymbol.startsWith(normalizedTerm) || aName.startsWith(normalizedTerm);
            const bStarts = bSymbol.startsWith(normalizedTerm) || bName.startsWith(normalizedTerm);
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
                    <strong>${formatRupeePrice(stock.price)}</strong>
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

function renderLandingSearchSuggestions() {
    if (!landingStockSearch || !landingSearchSuggestions) {
        return;
    }

    const matches = getStockSearchMatches(landingStockSearch.value);
    landingStockSearch.setAttribute("aria-expanded", matches.length ? "true" : "false");

    if (!matches.length) {
        landingSearchSuggestions.hidden = true;
        landingSearchSuggestions.innerHTML = "";
        return;
    }

    landingSearchSuggestions.hidden = false;
    landingSearchSuggestions.innerHTML = matches.map(stock => {
        const symbol = stock.symbol.replace(".NS", "");
        const isPositive = Number(stock.change || 0) >= 0;
        return `
            <button class="landing-search-suggestion" type="button" data-landing-symbol="${escapeAttribute(stock.symbol)}" role="option">
                <span>
                    <strong>${escapeHtml(symbol)}</strong>
                    <small>${escapeHtml(stock.name || symbol)}</small>
                </span>
                <span>
                    <strong>${formatRupeePrice(stock.price)}</strong>
                    <small class="${isPositive ? "gain" : "loss"}">${formatChange(stock.change)}</small>
                </span>
            </button>
        `;
    }).join("");
}

function closeLandingSearchSuggestions() {
    if (!landingStockSearch || !landingSearchSuggestions) {
        return;
    }

    landingSearchSuggestions.hidden = true;
    landingStockSearch.setAttribute("aria-expanded", "false");
}

function openLandingSearchResult(symbol) {
    const stock = getStockBySymbol(symbol);
    if (!stock) {
        return;
    }

    closeLandingSearchSuggestions();
    openStockPage(stock);
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
        tile.title = `${stock.symbol}: ${formatRupeePrice(stock.price)} (${formatChange(stock.change)})`;

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
                    <strong>${formatRupeePrice(stock.price)}</strong>
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
            <strong>${formatRupeePrice(stock.price)}</strong>
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
            <strong>${formatRupeePrice(stock.price)}</strong>
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
    // Prefer NSE valuation (real-time, fetched on every modal open — never stale)
    const marketCap = getFirstFilledValue(valuation.marketCap);
    if (marketCap !== undefined && marketCap !== null) {
        const num = Number(marketCap);
        if (!isNaN(num) && num > 0) {
            return escapeHtml("₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 }) + " Cr");
        }
    }
    // Fall back to Screener info string (30-day cache — may be stale but better than nothing)
    if (info.marketCap) {
        return formatInfoFallback(info.marketCap, "₹", "Cr");
    }
    return "--";
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

async function loadFinancialPageNews(stock) {
    const meta = document.getElementById("financialPageNewsMeta");
    const list = document.getElementById("financialPageNewsList");
    if (!meta || !list) return;

    try {
        const res = await fetch(`${API_BASE}/news/${encodeURIComponent(stock.symbol)}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Unable to load news.");
        const items = data.items || [];
        meta.textContent = items.length ? `${items.length} recent articles` : "No recent news found";
        list.innerHTML = items.length
            ? items.map(item => {
                const publisher = item.publisher || "News";
                const initial = publisher.charAt(0).toUpperCase();
                const sentiment = item.sentiment || "neutral";
                const cleanTitle = (item.title || "").replace(/\s[-–—]\s*[^-–—]{2,}$/, "").trim();
                const pillClass = sentiment === "positive" ? "fin-pill-pos" : sentiment === "negative" ? "fin-pill-neg" : "fin-pill-neu";
                const hasSummary = item.summary && item.summary !== item.title;
                return `
                    <article class="fin-news-card">
                        <div class="fin-news-top">
                            <div class="fin-news-source-tile">${escapeHtml(initial)}</div>
                            <div class="fin-news-meta">
                                <span class="fin-news-publisher">${escapeHtml(publisher)}</span>
                                <span class="fin-news-pill ${pillClass}">${escapeHtml(sentiment)}</span>
                            </div>
                        </div>
                        <a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer" class="fin-news-headline">${escapeHtml(cleanTitle || item.title)}</a>
                        ${hasSummary ? `<p class="fin-news-summary">${escapeHtml(item.summary)}</p>` : ""}
                    </article>
                `;
            }).join("")
            : `<article class="fin-news-card"><p class="fin-news-headline">No recent news found for this stock.</p></article>`;
    } catch (error) {
        if (meta) meta.textContent = error.message || "Unable to load news.";
        if (list) list.innerHTML = "";
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

function formatRupeePrice(value) {
    return `₹${formatPrice(value)}`;
}

function formatCompactPrice(value) {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHtml(String(value));
    }

    return `₹${Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
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
        return `₹${(number / 10000000).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
    }

    return `₹${number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
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
        return `₹${number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
    }

    if (Math.abs(number) >= 10000000) {
        return `₹${(number / 10000000).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })} Cr`;
    }

    return `₹${number.toLocaleString("en-IN", {
        maximumFractionDigits: 0
    })}`;
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
    button.addEventListener("click", () => openIndexHeatmap(button.dataset.indexView));
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
        openIndexHeatmap(marketIndexRow.dataset.indexView);
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

if (landingStockSearch) {
    landingStockSearch.addEventListener("input", renderLandingSearchSuggestions);
    landingStockSearch.addEventListener("focus", renderLandingSearchSuggestions);
}

if (landingStockSearchForm) {
    landingStockSearchForm.addEventListener("submit", event => {
        event.preventDefault();
        const firstMatch = getStockSearchMatches(landingStockSearch?.value, 1)[0];
        if (firstMatch) {
            openLandingSearchResult(firstMatch.symbol);
        }
    });
}

if (landingSearchSuggestions) {
    landingSearchSuggestions.addEventListener("click", event => {
        const option = event.target.closest("[data-landing-symbol]");
        if (option) {
            openLandingSearchResult(option.dataset.landingSymbol);
        }
    });
}

document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) {
        closeSearchSuggestions();
    }
    if (!event.target.closest(".landing-stock-search")) {
        closeLandingSearchSuggestions();
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

// Sidebar drawer toggle
document.getElementById("sidebarCollapseBtn")?.addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
});
document.getElementById("sidebarExpandBtn")?.addEventListener("click", () => {
    document.body.classList.remove("sidebar-collapsed");
});
