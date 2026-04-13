# AI-Based Personalized Nutrition and Recipe Generator

A premium full-stack application that suggests highly personalized meal plans based on health metrics, biological signals, and user preferences using Node.js, Express, React, and Ollama.

## ✨ Features

- **Flexible Plan Durations:** Generate meal schedules tailored to exact timeframes—select Days, Weeks, or Months.
- **Enterprise-Grade UI/UX:** A bespoke, polished UI featuring a sleek minimalist design, subtle box shadows, fast interactions, and professional Unsplash health imagery.
- **Precision Meal Scheduling:** AI dynamically crafts meal plans integrating an early morning kick-starter meal, alongside breakfast, lunch, dinner, and snacks. Every meal includes **explicit timing recommendations** (e.g., *7:00 AM*).
- **Fast Generation:** Aggressive prompt optimization guarantees that Ollama securely outputs concise markdown directly, bypassing long generation times while still returning step-by-step recipes.

## 🚀 Quick Start (Docker)

1. Install Docker and Docker Compose.
2. From the repo root, run:

```bash
docker compose up --build
```

3. Open the web app at http://localhost:3000
4. The API is at http://localhost:5000, and Ollama at http://localhost:11434
5. The compose file sets `OLLAMA_MODEL=llama3.2`. You can change it in `docker-compose.yml`.

Note: The first run may pull the model on-demand and can take a while.

## 💻 Local Dev (without Docker)

- Start **Ollama** locally and ensure it's running on `http://localhost:11434`
- **Backend:**
  - `cd backend`
  - `npm install`
  - `copy .env.example .env` (Modify as necessary)
  - `npm run dev` (API will listen on port 5000)
- **Frontend:**
  - `cd frontend`
  - `npm install`
  - `npm run dev`
- Open `http://localhost:5173` (Vite dev server). API proxies to `http://localhost:5000`.

## 📂 Architecture Structure

- `/backend/` Express API (`/api/generate-meals`) parsing input params and securely fetching from Ollama.
- `/frontend/` React + Vite modern UI component tree with centralized professional `styles.css`.
- `docker-compose.yml` 3 services: `ollama`, `api`, `web`

## ⚙️ Configuration

- **Backend environment variables:**
  - `PORT`: default `5000`
  - `OLLAMA_HOST`: default `http://localhost:11434`
  - `OLLAMA_MODEL`: default `llama3.2`
