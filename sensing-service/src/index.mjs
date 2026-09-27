import { createSensingServer } from './server.mjs';
import { createNativeSession } from './session.mjs';
const origins = (process.env.ECHOSHIFT_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174').split(',').map(value => value.trim());
if (origins.some(value => !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(value))) throw new Error('ECHOSHIFT_ORIGINS must contain explicit local HTTP origins.');
const port = Number(process.env.PRESAGE_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PRESAGE_PORT.');
const service = createSensingServer({ createSession: createNativeSession, origins });
service.server.on('error', () => { console.error('Cannot listen for sensing connections. Check that the port is free.'); process.exitCode = 1; });
service.server.listen(port, '127.0.0.1', () => {
  console.log(`EchoShift sensing service: http://127.0.0.1:${port}. Camera is OFF until Start live sensing.`);
  if (!process.env.PRESAGE_API_KEY?.trim()) console.log('API key is not configured. Fill in sensing-service/.env and restart this service.');
});
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (stopping) return;
  stopping = true;
  await service.shutdown();
});
