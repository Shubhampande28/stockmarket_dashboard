import { animate } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";

const pulseFrames = [
    [
        { symbol: "RELIANCE", change: 1.8, x: 8, y: 18 },
        { symbol: "HDFCBANK", change: 0.9, x: 52, y: 12 },
        { symbol: "INFY", change: -1.1, x: 30, y: 40 },
        { symbol: "ICICIBANK", change: 1.4, x: 66, y: 42 },
        { symbol: "TCS", change: -0.7, x: 10, y: 64 },
        { symbol: "SBIN", change: 2.2, x: 42, y: 68 },
        { symbol: "LT", change: 0.6, x: 76, y: 70 },
        { symbol: "ITC", change: -0.4, x: 58, y: 56 }
    ],
    [
        { symbol: "RELIANCE", change: 0.7, x: 56, y: 16 },
        { symbol: "HDFCBANK", change: 1.6, x: 14, y: 35 },
        { symbol: "INFY", change: -1.8, x: 62, y: 48 },
        { symbol: "ICICIBANK", change: 0.8, x: 32, y: 12 },
        { symbol: "TCS", change: -0.5, x: 8, y: 68 },
        { symbol: "SBIN", change: 1.1, x: 44, y: 66 },
        { symbol: "LT", change: 2.0, x: 74, y: 24 },
        { symbol: "ITC", change: -0.9, x: 28, y: 54 }
    ],
    [
        { symbol: "RELIANCE", change: 2.4, x: 34, y: 18 },
        { symbol: "HDFCBANK", change: -0.6, x: 72, y: 18 },
        { symbol: "INFY", change: 0.5, x: 12, y: 48 },
        { symbol: "ICICIBANK", change: 1.2, x: 54, y: 42 },
        { symbol: "TCS", change: -1.5, x: 34, y: 66 },
        { symbol: "SBIN", change: 0.8, x: 76, y: 66 },
        { symbol: "LT", change: 1.5, x: 8, y: 20 },
        { symbol: "ITC", change: -0.3, x: 52, y: 70 }
    ]
];

const tiles = Array.from(document.querySelectorAll("[data-pulse-tile]"));
let frameIndex = 0;

function momentumSize(change) {
    const absolute = Math.min(Math.abs(change), 2.6);
    return 0.86 + absolute * 0.18;
}

function glowLevel(change) {
    const absolute = Math.min(Math.abs(change), 2.6);
    return 0.18 + absolute * 0.13;
}

function applyFrame(frame) {
    frame.forEach(stock => {
        const tile = tiles.find(item => item.dataset.symbol === stock.symbol);
        if (!tile) {
            return;
        }

        const isPositive = stock.change >= 0;
        const scale = momentumSize(stock.change);
        const glow = glowLevel(stock.change);

        tile.classList.toggle("positive", isPositive);
        tile.classList.toggle("negative", !isPositive);
        tile.style.setProperty("--pulse-glow", glow.toFixed(2));
        tile.querySelector("span").textContent = `${stock.change > 0 ? "+" : ""}${stock.change.toFixed(1)}%`;

        animate(
            tile,
            {
                left: `${stock.x}%`,
                top: `${stock.y}%`,
                scale,
                opacity: [0.72, 1]
            },
            {
                duration: 1.65,
                easing: [0.22, 1, 0.36, 1]
            }
        );
    });
}

function pulseTiles() {
    tiles.forEach((tile, index) => {
        animate(
            tile,
            { y: [0, index % 2 ? -8 : 7, 0] },
            {
                duration: 7 + index * 0.28,
                repeat: Infinity,
                easing: "ease-in-out",
                delay: index * 0.16
            }
        );
    });
}

if (tiles.length) {
    applyFrame(pulseFrames[0]);
    pulseTiles();
    window.setInterval(() => {
        frameIndex = (frameIndex + 1) % pulseFrames.length;
        applyFrame(pulseFrames[frameIndex]);
    }, 4200);
}
