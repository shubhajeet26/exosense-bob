# 🌌 EXOSENSE — AI-Assisted Exoplanet Exploration Platform

> **Explore distant worlds. Analyze real NASA astronomical telemetry. Let AI guide your mission.**

Exosense is a futuristic, showcase-ready deep-space exoplanet exploration and intelligence platform. It transforms raw astronomical records from the **NASA Exoplanet Archive** into an interactive mission control interface featuring a **3D Galaxy Star Map**, **WebGL Planet Observatory**, **Deterministic Scoring Engine**, **Dual World Comparison**, **Discovery Timeline**, and a grounded **Gemini AI Mission Copilot**.

---

## 🚀 Core Features

* **🛰️ Mission Control**: Real-time telemetry ribbon, multi-parameter orbital scatter matrix, natural-language query decompiler, and live NASA dataset filtering.
* **🌌 3D Interactive Star Map & Fullscreen Planetarium**: Full 3D spatial positioning calculated from real NASA Right Ascension, Declination, and Distance coordinates with smooth camera fly-to orbits and fullscreen presentation mode.
* **🔭 3D Planet Observatory**: Interactive rotating WebGL world mesh with thermal atmospheric Fresnel rim glow, verified NASA physical telemetry, relative planetary size silhouette scale (*Earth vs. Target vs. Jupiter*), and habitable zone thermal profiling.
* **⚡ Algorithmic Exosense Score & Data Completeness**: 100% deterministic exploratory metric ($0\text{–}100$) evaluating temperate regime suitability, rocky radius profile, and archival data completeness without artificial habitability claims.
* **🤖 AI Mission Copilot**: Conversational multi-turn exploration copilot powered by Google Gemini, grounded strictly in NASA archival telemetry with a multi-model fallback cascade.
* **⚖️ Dual World Comparison**: Side-by-side comparative matrix evaluating physical parameter differentials with grounded AI comparative intelligence.
* **🔍 Discovery Center & Historical Timeline**: Data-driven categorical ranking (*Top Scores, Closest, Earth-Sized, Super-Earths, Temperate*) and interactive 1990–2026 discovery evolution timeline.
* **⚡ Mission Intelligence Engine**: Answers *"What should I explore next?"* using deterministic exploration priorities (`HIGH`, `MEDIUM`, `LOW`) and personal saved mission pattern analysis.
* **⭐ My Mission Manifest**: Client-side saved candidate portfolio (`localStorage`) with collection analytics and direct Observatory/Comparison triggers.
* **📥 Mission Card PNG Exporter**: One-click generation of high-resolution planetary mission intelligence cards for offline analysis and presentations.
* **🎨 3-Theme CSS Switcher**: Instant switching between **Deep Space Obsidian** *(Cyberpunk Navy)*, **JWST Gold** *(Infrared Beryllium)*, and **Academic Titanium** *(Minimalist High-Contrast Slate)*.
* **🚀 Guided Mission & Demo Mode**: 5-step onboarding tour and a floating presenter controller for live demonstrations.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 16 (Turbopack + App Router)
* **Language**: TypeScript 5 (100% strict type safety)
* **3D Visualizations**: Three.js, `@react-three/fiber`, `@react-three/drei`
* **Charts & Analytics**: Recharts
* **Animations**: Framer Motion
* **Styling**: Tailwind CSS v4, Custom Space HUD Design Tokens
* **AI Provider**: Google Generative AI (Gemini 3.5 Flash-Lite / 3.1 Flash-Lite fallback pipeline)
* **Astronomical Source**: NASA Exoplanet Archive TAP Web API (`pscomppars`)

---

## 🔒 Security Architecture

* **Server-Side API Key Protection**: The `GEMINI_API_KEY` is strictly accessed in server-side Next.js route handlers (`/api/ai/*`) and is **never** bundled or exposed to client browsers.
* **Zero Client Leakage**: `.env.local` is ignored in Git; no credentials or private tokens are logged or tracked.
* **Authoritative Source of Truth**: All planetary measurements originate authentically from the NASA Exoplanet Archive without synthetic fabrication.

---

## ⚙️ Local Development Setup

### 1. Prerequisites
* Node.js 18.18+ or Node.js 20+
* npm, pnpm, or yarn

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/shubhajeet26/exosense.git
cd exosense
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Google Gemini API Key (Get from https://aistudio.google.com/)
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Production Build & Verification

```bash
# Type check and build optimized production bundle
npm run build

# Start production server
npm run start
```

---

## ☁️ Deployment (Vercel Ready)

Exosense is optimized for zero-configuration deployment on **Vercel**:
1. Push repository to GitHub.
2. Import project into Vercel.
3. Add Environment Variable in Vercel Project Settings:
   * Key: `GEMINI_API_KEY`
   * Value: `[Your Gemini API Key]`
4. Deploy!

---

## 🌌 Scientific & AI Responsibility Disclaimers

1. **NASA Data Attribution**: Astronomical records are queried directly from the **NASA Exoplanet Archive** operated by the California Institute of Technology under contract with NASA.
2. **Exploratory Exosense Score**: The Exosense Interest Score is an exploratory composite index calculated by the application based on available parameters. It is **not** an official habitability ranking nor proof of extraterrestrial life.
3. **AI Interpretation**: AI Mission Copilot summaries are generated to explain and synthesize data supplied by the NASA catalog. Gemini does not alter astronomical measurements.

---

## 📄 License
MIT License. Built for advanced deep-space exoplanet visualization and exploration.
