const viewLabels = {
    all: "All stocks",
    gainers: "Top gainers",
    losers: "Top losers",
    it: "Nifty IT",
    bank: "Banking",
    others: "Others"
};

let currentView = "all";
let fullData = {};
let searchTerm = "";

const heatmap = document.getElementById("heatmap");
const message = document.getElementById("message");
const marketStatus = document.getElementById("marketStatus");
const stockCount = document.getElementById("stockCount");
const gainerCount = document.getElementById("gainerCount");
const loserCount = document.getElementById("loserCount");
const avgChange = document.getElementById("avgChange");
const viewTitle = document.getElementById("viewTitle");
const viewMeta = document.getElementById("viewMeta");
const searchInput = document.getElementById("stockSearch");
const refreshButton = document.getElementById("refreshButton");

async function loadHeatmap() {
    setLoading(true);

    try {
        const res = await fetch("http://127.0.0.1:5000/stocks");

        if (!res.ok) {
            throw new Error("Unable to reach market service.");
        }

        const data = await res.json();

        if (data.error === "TOKEN_EXPIRED") {
            throw new Error("Market token expired. Please update the token and refresh.");
        }

        fullData = normalizePayload(data);
        updateSummary();
        renderGrid();
        setStatus("ready", "Live data loaded");
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

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message visible ${type}`;
}

function hideMessage() {
    message.className = "message";
}

function updateSummary() {
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
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.toggle("active", button.dataset.view === type);
    });
    renderGrid();
}

function getColor(change) {
    const value = Number(change) || 0;
    const intensity = Math.min(Math.abs(value) / 5, 1);
    const alpha = 0.38 + intensity * 0.52;

    if (value >= 0) {
        return `linear-gradient(135deg, rgba(22, 101, 52, ${alpha}), rgba(34, 197, 94, ${alpha}))`;
    }

    return `linear-gradient(135deg, rgba(127, 29, 29, ${alpha}), rgba(239, 68, 68, ${alpha}))`;
}

function getMovementStyle(change, index) {
    const value = Number(change) || 0;
    const intensity = Math.min(Math.abs(value) / 5, 1);
    const pulseScale = 0.985 - intensity * 0.095;
    const pulseDuration = 2.9 - intensity * 1.45;
    const pulseGlow = 0.18 + intensity * 0.5;
    const moveHeight = 6 + intensity * 28;
    const pulseDelay = -(index % 8) * 0.18;

    return {
        pulseScale: Math.max(pulseScale, 0.89).toFixed(3),
        pulseDuration: `${Math.max(pulseDuration, 1.25).toFixed(2)}s`,
        pulseGlow: pulseGlow.toFixed(2),
        moveHeight: `${moveHeight.toFixed(0)}px`,
        pulseDelay: `${pulseDelay.toFixed(2)}s`
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

function getFilteredStocks() {
    const stocks = [...(fullData[currentView] || [])];
    const sortedStocks = stocks.sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0));

    if (!searchTerm) {
        return sortedStocks;
    }

    return sortedStocks.filter(stock => stock.symbol.toLowerCase().includes(searchTerm));
}

function renderGrid() {
    const stocks = getFilteredStocks();

    heatmap.innerHTML = "";
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
        const tile = document.createElement("article");
        const movement = getMovementStyle(stock.change, index);

        tile.className = `tile ${getMovementClass(stock.change)}`;
        tile.style.background = getColor(stock.change);
        tile.style.setProperty("--pulse-scale", movement.pulseScale);
        tile.style.setProperty("--pulse-duration", movement.pulseDuration);
        tile.style.setProperty("--pulse-glow", movement.pulseGlow);
        tile.style.setProperty("--move-height", movement.moveHeight);
        tile.style.setProperty("--pulse-delay", movement.pulseDelay);
        tile.title = `${stock.symbol}: ${formatPrice(stock.price)} (${formatChange(stock.change)})`;

        tile.innerHTML = `
            <div class="symbol">${stock.symbol}</div>
            <div class="price">${formatPrice(stock.price)}</div>
            <div class="change">${stock.change >= 0 ? "UP" : "DOWN"} ${formatChange(stock.change)}</div>
            <div class="tile-rank">#${index + 1}</div>
        `;

        heatmap.appendChild(tile);
    });
}

function formatPrice(value) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatChange(value) {
    const number = Number(value || 0);
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(2)}%`;
}

document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => loadView(button.dataset.view));
});

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderGrid();
});

refreshButton.addEventListener("click", loadHeatmap);

window.addEventListener("load", loadHeatmap);
