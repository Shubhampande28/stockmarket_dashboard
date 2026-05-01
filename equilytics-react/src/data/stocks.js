export const stocks = [
  {
    id: "HDFCBANK",
    name: "HDFC Bank",
    sector: "Banking",
    price: 1684.2,
    change: 1.84,
    marketCap: "12.9L Cr",
    pe: 18.4,
    roe: 15.8,
    sparkline: [44, 48, 46, 52, 58, 57, 63, 67, 71]
  },
  {
    id: "INFY",
    name: "Infosys",
    sector: "IT",
    price: 1518.65,
    change: 0.92,
    marketCap: "6.3L Cr",
    pe: 23.1,
    roe: 31.4,
    sparkline: [52, 51, 55, 53, 58, 62, 61, 66, 68]
  },
  {
    id: "RELIANCE",
    name: "Reliance Industries",
    sector: "Energy",
    price: 2912.35,
    change: -0.46,
    marketCap: "19.7L Cr",
    pe: 27.8,
    roe: 9.6,
    sparkline: [72, 70, 69, 67, 68, 64, 61, 62, 59]
  },
  {
    id: "TCS",
    name: "Tata Consultancy Services",
    sector: "IT",
    price: 3725.8,
    change: 1.12,
    marketCap: "13.5L Cr",
    pe: 29.6,
    roe: 44.2,
    sparkline: [58, 61, 60, 64, 67, 66, 72, 75, 78]
  },
  {
    id: "TITAN",
    name: "Titan Company",
    sector: "Consumer",
    price: 3524.1,
    change: -1.28,
    marketCap: "3.1L Cr",
    pe: 86.4,
    roe: 28.8,
    sparkline: [80, 77, 74, 76, 70, 68, 66, 63, 61]
  },
  {
    id: "LT",
    name: "Larsen & Toubro",
    sector: "Infrastructure",
    price: 3678.0,
    change: 2.34,
    marketCap: "5.1L Cr",
    pe: 34.9,
    roe: 14.2,
    sparkline: [42, 45, 49, 51, 54, 59, 62, 66, 70]
  },
  {
    id: "SUNPHARMA",
    name: "Sun Pharma",
    sector: "Pharma",
    price: 1812.45,
    change: 0.38,
    marketCap: "4.3L Cr",
    pe: 36.2,
    roe: 16.9,
    sparkline: [50, 49, 52, 54, 53, 55, 57, 56, 58]
  },
  {
    id: "MARUTI",
    name: "Maruti Suzuki",
    sector: "Auto",
    price: 12448.7,
    change: -0.82,
    marketCap: "3.9L Cr",
    pe: 27.1,
    roe: 15.5,
    sparkline: [68, 66, 65, 63, 64, 60, 58, 57, 55]
  }
];

export const filterGroups = [
  {
    id: "valuation",
    label: "Valuation",
    description: "Find fairly priced companies.",
    controls: [
      { type: "range", label: "P/E below", value: 35, min: 5, max: 100 },
      { type: "chips", label: "Market cap", options: ["Large", "Mid", "Small"] }
    ]
  },
  {
    id: "quality",
    label: "Quality",
    description: "Filter for durable fundamentals.",
    controls: [
      { type: "range", label: "ROE above", value: 15, min: 0, max: 60 },
      { type: "toggle", label: "Low debt only", enabled: true }
    ]
  },
  {
    id: "momentum",
    label: "Momentum",
    description: "Surface stocks with price strength.",
    controls: [
      { type: "chips", label: "Trend", options: ["1M up", "Near high", "Volume spike"] },
      { type: "toggle", label: "Positive today", enabled: true }
    ]
  }
];
