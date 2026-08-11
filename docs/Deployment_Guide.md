# Deployment & Development Guide

This guide explains how to build, run, and deploy the AI-Based Personalized Nutrition and Recipe Generator application.

## System Architecture Overview

The system is composed of:
1. **Express Backend** (`backend/`):
   - Handles API routing, user request validation (via Joi), prompt assembly, and integration with the Google Gemini API.
   - Serves custom-tailored dish visualization pages dynamically (`/api/dishes/:name`).
2. **React Frontend** (`frontend/`):
   - A Vite-powered SPA containing a sleek glassmorphism UI dashboard, custom dietary planning questionnaires, and camera/file-based plate scanning elements.
3. **Expo Mobile Frontend** (`expo-frontend/`):
   - A cross-platform React Native mobile app utilizing Expo Router, featuring local profile management, visual food scans, and QR code sharing.
4. **AI Core**:
   - Google Gemini API (via `@google/genai`) for processing meal generation queries and analyzing photo uploads.

---

## Prerequisites

- **Node.js**: Version 18.x or later.
- **npm**: Version 9.x or later.
- **Docker & Docker Compose**: (Required for Docker-based deployment)
- **Google Gemini API Key**: Obtain one for free from [Google AI Studio](https://aistudio.google.com/).

---

## Environment Variables

### Backend Configuration
Create a `.env` file in the `/backend` folder with the following variables:

```env
PORT=5000
NODE_ENV=development

# Google Gemini API Keys
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

*Note:* `GEMINI_MODEL` defaults to `gemini-3.5-flash` if left unspecified.

---

## Option A: Deployment with Docker Compose (Recommended)

Docker Compose orchestrates the client and server containers together, matching them up inside a unified local network.

1. Ensure Docker Desktop is active.
2. In the repository root, create or update a `.env` file containing:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
3. Run the compose environment:
   ```bash
   docker compose up --build
   ```
4. Access the services:
   - **Frontend (UI)**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)

### Basic Docker Management Commands
- **Stop services**: `Ctrl+C` or `docker compose down`
- **Rebuild and restart containers**: `docker compose up --build`
- **Stream logs**: `docker compose logs -f`

---

## Option B: Local Development (Without Docker)

You can run individual components locally during development for faster hot reloading.

### 1. Launch the Backend API
Navigate to `/backend`:
```bash
cd backend
npm install
# Copy the env template and fill in your Gemini API key
copy .env.example .env
# Start the Express server in development mode
npm run dev
```
The backend starts listening at [http://localhost:5000](http://localhost:5000). You can check its health at `/api/health`.

### 2. Launch the React Web Frontend
Navigate to `/frontend`:
```bash
cd frontend
npm install
npm run dev
```
The React development server runs at [http://localhost:5173](http://localhost:5173). It is configured to proxy all `/api/*` requests to the local backend port `5000`.

### 3. Launch the Expo Mobile Frontend
Navigate to `/expo-frontend`:
```bash
cd expo-frontend
npm install
npx expo start
```
Use the printed QR code to open the app via the Expo Go app on your physical iOS/Android device, or launch it in an emulator/simulator.

---

## Production Build & Manual Hosting

If you want to compile static bundles for manual hosting:

### Web Frontend Compilation
```bash
cd frontend
npm run build
```
This command bundles optimized assets into `/frontend/dist/`. These files can be hosted on static hosting services (e.g. Netlify, Vercel, Nginx, or AWS S3).

### Backend Server Daemon
To deploy the backend permanently, use a process manager like **PM2**:
```bash
cd backend
npm install
npm install -g pm2
pm2 start src/index.js --name "nutrition-api"
```

---

## Health Checks & Diagnostics

- **API Base Route**: `GET http://localhost:5000/api/health` -> Returns `{"status": "ok"}`
- **Config check**: `GET http://localhost:5000/api/config` -> Returns the backend's local network IP (essential for mobile pairing)
- **Dish HTML Page**: `GET http://localhost:5000/api/dishes/:name?diseases=Diabetes&allergies=peanuts` -> Renders the custom visual macros layout
