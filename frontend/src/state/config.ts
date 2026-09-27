export const MIN_STATE_DURATION_MS = 60_000;
export const CANDIDATE_CONFIRMATION_MS = 2_000;

/** Gameplay tuning, not clinical thresholds or validated Presage ranges. */
export const DEFAULT_STATE_CONFIG = Object.freeze({
  minStateDurationMs: MIN_STATE_DURATION_MS,
  candidateConfirmationMs: CANDIDATE_CONFIRMATION_MS,
  staleAfterMs: 3_000,
  dropoutGraceMs: 5_000,
  windowSize: 5,
  heartRateEngagedEnter: 85,
  heartRateEngagedExit: 80,
  heartRateHighEnter: 110,
  heartRateHighExit: 100,
  breathingRateEngagedEnter: 18,
  breathingRateEngagedExit: 16,
  breathingRateHighEnter: 24,
  breathingRateHighExit: 22,
  engagementEnter: 0.65,
  engagementExit: 0.55,
});
export type StateConfig = typeof DEFAULT_STATE_CONFIG;

export function stateConfig(overrides: Partial<StateConfig>): StateConfig {
  const config = { ...DEFAULT_STATE_CONFIG, ...overrides };
  for (const [name, value] of Object.entries(config)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${name}`);
  }
  if (!Number.isInteger(config.windowSize) || config.windowSize < 1 || config.staleAfterMs <= 0) {
    throw new RangeError('windowSize and staleAfterMs must be positive');
  }
  for (const [enter, exit] of [
    [config.heartRateEngagedEnter, config.heartRateEngagedExit],
    [config.heartRateHighEnter, config.heartRateHighExit],
    [config.breathingRateEngagedEnter, config.breathingRateEngagedExit],
    [config.breathingRateHighEnter, config.breathingRateHighExit],
    [config.engagementEnter, config.engagementExit],
  ]) if (exit >= enter) throw new RangeError('Exit threshold must be below entry threshold');
  if (config.engagementEnter > 1 || config.heartRateHighExit <= config.heartRateEngagedEnter ||
      config.breathingRateHighExit <= config.breathingRateEngagedEnter) {
    throw new RangeError('Gameplay thresholds must be ordered');
  }
  return Object.freeze(config);
}
