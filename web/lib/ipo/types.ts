export type IpoStatus = "upcoming" | "open" | "closed" | "listing-soon" | "listed";
export type IpoSegment = "mainboard" | "sme";

export interface Ipo {
  slug: string; // "jio-platforms"
  name: string;
  segment: IpoSegment;
  exchanges: string[]; // ["NSE", "BSE"] or ["NSE Emerge"]
  status: IpoStatus; // derived from dates in IST, not from the source's label
  dates: { anchor?: string; open?: string; close?: string; allotment?: string; listing?: string }; // ISO dates
  priceBand: { low: number; high: number } | null; // single price -> low === high
  lotSize: number | null;
  minInvestment: number | null; // lotSize * high, computed, not fetched
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  ofsCr: number | null;
  quotas?: { qib?: number; nii?: number; retail?: number; employee?: number }; // % of issue
  subscription?: {
    asOf: string; // ISO timestamp of the figures
    overall: number; // times subscribed
    qib?: number;
    nii?: number;
    retail?: number;
    employee?: number;
  };
  registrar?: string;
  leadManagers?: string[];
  about?: string; // one or two lines from the offer document
  offerDocUrl?: string; // RHP/DRHP link
  listing?: { price?: number; gainPct?: number }; // after listing
}

export interface IpoFeed {
  ipos: Ipo[];
  pipeline: string[]; // companies with SEBI approval / filed papers, no dates
  asOf: string; // ISO timestamp
  stale: boolean; // true if this is a fallback cached copy after a fetch failure
}
