/**
 * Vercel Serverless Entry for Full-Stack Deployment
 * 
 * If you want to deploy BOTH frontend + backend on Vercel:
 * 1. Set Root Directory to "." in Vercel dashboard
 * 2. Build Command: npm run build
 * 3. Output Directory: client/dist
 * 4. This file will be used as serverless function for /api/*
 * 
 * For separate deployment (recommended):
 * - Frontend on Vercel (client/)
 * - Backend on Render/Railway/Fly.io
 * Then update vercel.json rewrites to point to your backend URL
 */

import { createApp } from "../server/src/app.js";

let app: any = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    const created = await createApp();
    app = created.app;
  }
  return app(req, res);
}
