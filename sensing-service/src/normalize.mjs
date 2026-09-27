/** SDK timestamps are epoch microseconds; stable is the SDK's reliability verdict. */
export function createNormalizer(now = Date.now) {
  const seen = { heartRate: -Infinity, breathingRate: -Infinity };
  return payload => {
    if (!payload || Buffer.isBuffer(payload)) return null;
    const result = { source: 'presage' };
    const timestamps = [];
    for (const [key, samples] of [['heartRate', payload.cardio?.pulseRate], ['breathingRate', payload.breathing?.rate]]) {
      if (!Array.isArray(samples) || !samples.length) continue;
      const sample = samples.at(-1);
      const timestamp = Number(sample?.timestamp) / 1000;
      if (sample?.stable !== true || !Number.isFinite(sample.value) || sample.value <= 0 ||
          !Number.isFinite(sample.confidence) || sample.confidence < 0 || sample.confidence > 100 ||
          !Number.isFinite(timestamp) || timestamp <= seen[key] || timestamp > now() || now() - timestamp >= 3000) continue;
      seen[key] = timestamp;
      result[key] = sample.value;
      timestamps.push(timestamp);
    }
    return timestamps.length ? { ...result, timestamp: Math.min(...timestamps) } : null;
  };
}
