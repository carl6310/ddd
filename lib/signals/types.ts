export const SIGNAL_PROVIDER_MODES = ["input_only", "search_enabled", "url_enriched"] as const;

export const SIGNAL_TYPES = ["policy", "transaction", "supply", "planning", "public_sentiment", "comparison"] as const;

export type SignalProviderMode = (typeof SIGNAL_PROVIDER_MODES)[number];
export type SignalType = (typeof SIGNAL_TYPES)[number];

export interface SignalBriefSignal {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  signalType: SignalType;
  summary: string;
  whyItMatters: string;
}

export interface SignalBrief {
  queries: string[];
  signals: SignalBriefSignal[];
  gaps: string[];
  freshnessNote: string;
}

export interface SignalSourceDigest {
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  note: string;
  ok: boolean;
  error?: string;
}

