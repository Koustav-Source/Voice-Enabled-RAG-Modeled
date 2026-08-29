/**
 * Vercel Serverless Function - Full-Stack RAG API
 * Handles all /api/* routes
 */

let appInstance = null;
let initPromise = null;

async function getApp() {
  if (appInstance) return appInstance;
  
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // Try dist first (production build), fallback to src
        let createApp;
        try {
          const mod = await import('../server/dist/app.js');
          createApp = mod.createApp;
        } catch {
          const mod = await import('../server/src/app.js');
          createApp = mod.createApp;
        }
        
        const { app } = await createApp();
        appInstance = app;
        return app;
      } catch (err) {
        console.error('Failed to create app:', err);
        throw err;
      }
    })();
  }
  
  return initPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to initialize RAG service',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
