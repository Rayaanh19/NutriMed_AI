import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import generateMealsRouter from './routes/generateMeals.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/config', (_req, res) => {
  res.json({ localIp: getLocalIp() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

import foodAnalysisRouter from './routes/foodAnalysis.js';
app.use('/api', generateMealsRouter);
app.use('/api', foodAnalysisRouter);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
  server.timeout = 600000; // 10 minutes
}

export default app;

