/**
 * CRA dev-server proxy.
 *
 * In local development the default backend URL is http://localhost:8000.
 * When running inside Docker Compose set REACT_APP_BACKEND_URL=http://backend:8000
 * in the frontend service's environment block — this file picks it up automatically.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

module.exports = function (app) {
  const proxy = createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    logLevel: 'warn',
  });

  // forward every API path to the backend
  [
    '/upload-image',
    '/upload-video',
    '/process',
    '/download',
    '/outputs',
  ].forEach((path) => app.use(path, proxy));
};
