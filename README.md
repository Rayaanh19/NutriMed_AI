# 🥗 AI-Based Personalized Nutrition & Recipe Generator

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_API-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://aistudio.google.com/)

A premium, full-stack, multi-platform ecosystem designed to deliver hyper-personalized nutrition advice, AI meal plans, and real-time food diagnostics. Powered by **Google Gemini API** (`gemini-3.5-flash`), this application integrates a **Node.js Express backend**, a **React Web Dashboard**, and a **React Native Expo Mobile Client**.

---

## 🌟 Key Capabilities

### 1. 📅 Intelligent Meal Planner
- **Customizable Durations:** Instantly generate schedules for exact spans—**Days**, **Weeks**, or **Months**.
- **Precise Chrono-Scheduling:** AI structures daily plans complete with early morning wake-up tonics, breakfast, lunch, dinner, snacks, and **explicit timing guidelines** (e.g., *7:30 AM*).
- **Macro & Micronutrient Tracking:** Detailed calorie estimation and macro balances (proteins, carbs, fats) custom-tailored to the user's biological metrics (age, gender, height, weight, activity levels).

### 2. 📷 Computer Vision Plate Scanner & Analyzer
- **Visual Food Recognition:** Upload plate photos (web) or snap pictures (mobile camera) to dynamically identify dishes and ingredients.
- **Suitability Diagnostic Engine:** Automatically evaluates identified food against the user's health profile:
  - **Allergies Check:** Blocks recipes and flags safety hazards if any allergen is present.
  - **Chronic Disease Safeguards:** Evaluates nutritional content against conditions like **Diabetes** (glycemic impacts, sugar content) and **Hypertension** (sodium limits, processing level).
- **Dynamic HTML Report Server:** Serves visual dish detail templates (`/api/dishes/:name`) containing CSS-rendered circular SVG macro progress wheels.

### 3. 📱 Cross-Platform Mobile Client (Expo)
- Full React Native UI leveraging Expo Router.
- Built-in live camera scanner with scan-sweeping animations.
- Offline-first local storage for calculations, user profiles, and scan logs.
- **Account Switcher:** Seamlessly save and switch between multiple user profiles.
- **QR Code Sharing:** Generate and scan sharing codes to load recipe summaries instantly.

---

## 📂 Architecture Structure

```
aibasednutrition/
├── backend/                  # Node.js + Express API Server
│   ├── src/
│   │   ├── routes/           # generateMeals.js, foodAnalysis.js
│   │   ├── templates/        # Responsive HTML/CSS templates for dish pages
│   │   ├── geminiClient.js   # @google/genai API integrations
│   │   └── index.js          # App entry and configurations
│   └── Dockerfile
├── frontend/                 # React + Vite Web Dashboard
│   ├── src/
│   │   ├── components/       # FoodScanner, LiveScanner, DashboardHome, etc.
│   │   ├── App.jsx           # State coordinator and route visualizer
│   │   └── styles.css        # Glassmorphism design system & UI tokens
│   └── Dockerfile
├── expo-frontend/            # Expo + React Native Mobile Application
│   ├── src/
│   │   ├── app/              # Native screens: planner, scanner, settings, layout
│   │   ├── components/       # Cross-platform interactive views
│   │   └── utils/            # api.ts (host network resolving), storage.ts
└── docs/                     # Comprehensive Architecture & Deployment guides
    ├── Code_Explanation.md
    └── Deployment_Guide.md
```

---

## 🚀 Quick Start (Docker Compose)

The easiest way to spin up the web app and backend API together in a production-like environment:

1. **Obtain a Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
2. In the repository root directory, create a `.env` file and append:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Run the services:
   ```bash
   docker compose up --build
   ```
4. Access the clients:
   - 🌐 **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
   - ⚡ **Express API:** [http://localhost:5000](http://localhost:5000)

---

## 💻 Local Development Setup (Without Docker)

### 1. Backend Server
```bash
cd backend
npm install
copy .env.example .env   # On macOS/Linux: cp .env.example .env
# Set your GEMINI_API_KEY inside the .env file
npm run dev
```
*API is active at [http://localhost:5000](http://localhost:5000)*.

### 2. Frontend React Web App
```bash
cd frontend
npm install
npm run dev
```
*Web dashboard opens at [http://localhost:5173](http://localhost:5173) (Proxies `/api` requests to port `5000` automatically)*.

### 3. Mobile Expo App
```bash
cd expo-frontend
npm install
npx expo start
```
*Scan the barcode in the terminal with your phone using **Expo Go** (Android/iOS)*.

---

## ⚙️ Configuration & Environment

| Environment Variable | Description | Default |
|---|---|---|
| `PORT` | Local network port for the backend server | `5000` |
| `GEMINI_API_KEY` | **Required.** Your Gemini API key from Google AI Studio | None |
| `GEMINI_MODEL` | Google generative model used for scans and planning | `gemini-3.5-flash` |

---

## 📡 API Endpoints

- **`POST /api/generate-meals`**: Receives biological parameters and streams a markdown meal plan.
- **`POST /api/scan-food`**: Accepts a base64-encoded image and user health criteria to return structured nutrition JSON.
- **`POST /api/food-details`**: Takes a plain-text query (e.g. food name, barcode ID) and queries Gemini for macro details.
- **`GET /api/dishes/:name`**: Renders a premium responsive HTML screen illustrating ingredients, directions, macro breakdowns, and safety suitability check marks.

---

## 📖 Further Documentation

For deep technical insights and advanced deployment checklists, refer to the guides in `/docs`:
* 🛠️ [Code Architecture and Flow Explanation](file:///d:/projects/aibasednutrition/docs/Code_Explanation.md)
* 🛳️ [Advanced Deployment Guide](file:///d:/projects/aibasednutrition/docs/Deployment_Guide.md)
