/**
 * Display sector grouping for the heatmap (brief section 5: "at most 8
 * blocks"). Backend sector keys come from app.py's SECTOR_GROUPS /
 * SECTOR_TILE_LABELS -- reused here, not reinvented, then merged down to 8
 * display groups per the brief's suggested grouping.
 */

export const BACKEND_SECTOR_KEYS = [
  "bank", "it", "auto", "pharma", "fmcg", "metal", "realty",
  "energy", "psu", "media", "infra", "finance", "chemicals",
  "telecom", "cement", "consumer",
] as const;

export type BackendSectorKey = (typeof BACKEND_SECTOR_KEYS)[number];

export const DISPLAY_SECTORS = [
  "Financials",
  "IT",
  "Energy & Power",
  "FMCG",
  "Auto",
  "Pharma & Healthcare",
  "Metals & Materials",
  "Industrials & others",
] as const;

export type DisplaySector = (typeof DISPLAY_SECTORS)[number];

const BACKEND_TO_DISPLAY: Record<string, DisplaySector> = {
  bank: "Financials",
  psu: "Financials",
  finance: "Financials",
  it: "IT",
  energy: "Energy & Power",
  fmcg: "FMCG",
  consumer: "FMCG",
  auto: "Auto",
  pharma: "Pharma & Healthcare",
  metal: "Metals & Materials",
  chemicals: "Metals & Materials",
  realty: "Industrials & others",
  media: "Industrials & others",
  infra: "Industrials & others",
  telecom: "Industrials & others",
  cement: "Industrials & others",
};

export function displaySectorFor(backendKey: string | null | undefined): DisplaySector {
  if (!backendKey) return "Industrials & others";
  return BACKEND_TO_DISPLAY[backendKey] ?? "Industrials & others";
}
