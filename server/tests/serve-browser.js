import { createServer } from 'vite';

// Test-only server: the test harness allocates isolated loopback ports.
const port = Number(process.env.FITIZBABY_TEST_WEB_PORT);
const apiPort = Number(process.env.API_PORT);
if (process.env.NODE_ENV !== 'test' || !Number.isInteger(port) || !Number.isInteger(apiPort) || port < 1024 || port > 65535 || apiPort < 1024 || apiPort > 65535) throw new Error('TEST_PORTS_REQUIRED');
const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: true, proxy: { '/api': 'http://127.0.0.1:' + apiPort } } });
await server.listen();
process.on('SIGTERM', async () => { await server.close(); process.exit(0); });
