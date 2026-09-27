/** Shared module-boundary contracts. Keep docs/api-contracts.md in sync. */
export interface PlayerMetrics {
  heartRate?: number;
  breathingRate?: number;
  engagement?: number;
  timestamp: number;
  source: "presage" | "demo";
}

/** Gameplay interpretation of signals, not a medical diagnosis. */
export type PlayerState =
  | "CALM"
  | "ENGAGED"
  | "HIGH_AROUSAL"
  | "UNKNOWN";

export interface GameContext {
  sceneId: string;
  storyBeat: string;
  playerState: PlayerState;
  recentChoice?: string;
  allowedEvents: string[];
}

export interface MetricsProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatest(): PlayerMetrics | null;
  subscribe(listener: (metrics: PlayerMetrics) => void): () => void;
}
