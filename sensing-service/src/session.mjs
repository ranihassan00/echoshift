import { createNormalizer } from './normalize.mjs';

const ERROR_CODES = { 2: 'authentication_failed', 3: 'configuration_failed', 4: 'credits_exhausted', 5: 'network_error', 6: 'service_error', 7: 'camera_unavailable' };

/** No camera or network work until start. SDK import is lazy and key stays here. */
export async function createNativeSession({ emit, apiKey = process.env.PRESAGE_API_KEY,
  cameraIndex = Number(process.env.PRESAGE_CAMERA_INDEX ?? 0), now = Date.now,
  loadSdk = () => import('@smartspectra/node-sdk') }) {
  if (!apiKey?.trim()) throw Object.assign(new Error('Set PRESAGE_API_KEY in the local service .env file.'), { code: 'missing_key' });
  if (!Number.isInteger(cameraIndex) || cameraIndex < 0) throw new Error('Invalid camera index.');
  const { SmartSpectraSDK, SmartSpectraLogLevel, decodeMetrics } = await loadSdk();
  const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [2, 15],
    logLevel: SmartSpectraLogLevel.kNone, enableTelemetry: false });
  const normalize = createNormalizer(now);
  let stopped = false, started = false, running = false, valid = false, stopping;
  const send = message => { if (!stopped) emit(message); };
  sdk.on('validationStatus', code => {
    valid = code === 0;
    send({ type: 'status', status: valid ? 'warming' : 'positioning', validationCode: code });
  });
  sdk.on('metrics', buffer => {
    if (stopped || !valid) return;
    try {
      const metrics = normalize(decodeMetrics(buffer));
      if (metrics) send({ type: 'metrics', metrics });
    } catch { send({ type: 'error', code: 'invalid_payload' }); }
  });
  sdk.on('error', code => send({ type: 'error', code: ERROR_CODES[code] ?? 'sensing_failed' }));
  sdk.on('processingStatus', code => {
    if (code === 3) running = true;
    if (started && (code === 5 || (running && code === 1))) send({ type: 'error', code: 'sensing_stopped' });
  });
  return {
    start() {
      if (stopped || started) return;
      sdk.useCamera({ deviceIndex: cameraIndex });
      started = true;
      send({ type: 'status', status: 'warming' });
      sdk.start();
    },
    stop() {
      if (stopping) return stopping;
      stopped = true;
      stopping = (async () => { try { if (started) await sdk.stopAsync(); } finally { await sdk.destroy(); } })();
      return stopping;
    }
  };
}

