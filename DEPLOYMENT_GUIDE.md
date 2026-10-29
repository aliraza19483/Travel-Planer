# 🚀 Deployment Guide: Backend on Render & Frontend on Vercel

Yes, **100% YES!** Deploying the Node.js/Express backend on **Render** and the Vanilla HTML/CSS/JS frontend on **Vercel** is not only possible—it is the **modern industry-standard decoupled architecture**.

This guide provides simple, step-by-step instructions to get your Travel Planner live on the internet for free.

---

## 🏗️ Architecture Overview

```text
┌───────────────────────────────────────┐          ┌────────────────────────────────────────┐
│           VERCEL (Frontend)           │          │            RENDER (Backend)            │
│      https://wanderplan.vercel.app    │          │  https://wanderplan-api.onrender.com   │
├───────────────────────────────────────┤          ├────────────────────────────────────────┤
│  • Serves HTML5, CSS3, JavaScript     │  HTTPS   │  • Express.js REST API Server          │
│  • Edge CDN (sub-millisecond load)    │ ───────> │  • JSON File Database + Auto Seed      │
│  • Leaflet Interactive Route Maps     │   REST   │  • Weather Service + 30-min Cache      │
│  • Multi-Currency Converter Widget    │   JWT    │  • Swagger API Docs (/api/docs)        │
└───────────────────────────────────────┘          └────────────────────────────────────────┘
```

---

## 📦 Step 1: Push Project to GitHub

If your project is not yet on GitHub:

1. Open PowerShell or Terminal in the root directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of WanderPlan full-stack travel planner"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `travel-planner`).
3. Link and push your repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/travel-planner.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚙️ Step 2: Deploy Backend on Render (Free)

1. Sign up or log in at **[render.com](https://render.com/)**.
2. Click **New +** in the top navigation and select **Web Service**.
3. Connect your GitHub repository (`travel-planner`).
4. Configure the Web Service settings:
   - **Name**: `wanderplan-api` (or any unique name)
   - **Region**: Choose the closest region (e.g., Singapore or Frankfurt)
   - **Root Directory**: `server` ⚠️ *(Important! Type `server` here)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Advanced** and add these **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `JWT_SECRET` | `your_secret_key_college_2026` | Random secure string |
   | `CLIENT_URL` | `*` | Allows calls from Vercel |
6. Click **Create Web Service**.
7. Render will build and deploy your backend. Once done, copy your **Render URL**:
   👉 Example: `https://wanderplan-api.onrender.com`

> **Note on Render Free Tier:** Render spins down free web services after 15 minutes of inactivity. When a request comes in, it automatically wakes up in ~30–45 seconds. The database automatically seeds demo users and destinations on startup!

---

## 🎨 Step 3: Deploy Frontend on Vercel (Free)

1. Sign up or log in at **[vercel.com](https://vercel.com/)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`travel-planner`).
4. In the **Configure Project** screen:
   - **Project Name**: `wanderplan` (or any name)
   - **Framework Preset**: `Other`
   - **Root Directory**: Click *Edit* and select **`client`** ⚠️ *(Important!)*
5. Click **Deploy**.
6. In ~15 seconds, Vercel will complete the build and give you a live frontend URL:
   👉 Example: `https://wanderplan.vercel.app`

---

## 🔗 Step 4: Connect Frontend to Backend

We have made this **1-click easy**! You have three flexible options:

### 🌟 Option A: 1-Click Magic Link (Easiest for Viva / Sharing)
Simply open your Vercel URL with the `?api=` parameter:
```text
https://wanderplan.vercel.app/?api=https://wanderplan-api.onrender.com
```
- WanderPlan automatically detects the parameter, saves your Render backend URL into `localStorage`, and connects all API calls immediately!
- Anyone opening that link (teachers, evaluators, friends) is instantly connected.

### Option B: Browser Console
Open `https://wanderplan.vercel.app`, press `F12` (Developer Console), and paste:
```javascript
setBackendUrl('https://wanderplan-api.onrender.com');
```
The page will refresh and stay connected to your Render backend permanently.

### Option C: Hardcode in HTML (Optional)
In `client/index.html` right before `<script src="js/api.js"></script>`, add:
```html
<script>
  window.WANDERPLAN_API_URL = 'https://wanderplan-api.onrender.com';
</script>
```
Commit and push to GitHub, and Vercel will auto-deploy the change.

---

## 🎓 Viva Questions: Why This Setup is Impressive

When examiners ask about your deployment architecture, you can explain:

1. **Separation of Concerns**:
   - The Frontend (presentation layer) and Backend (business logic & REST APIs) are completely decoupled.
2. **Global Edge CDN Performance**:
   - Vercel caches HTML, CSS, JS, and images on edge servers worldwide, giving near-zero load times.
3. **Independent Scalability**:
   - If traffic increases, the backend server can be scaled independently on Render without touching the frontend assets.
4. **CORS & Secure JWT Authentication**:
   - Demonstrates proper Cross-Origin Resource Sharing (`CORS`) with Bearer JWT tokens across two separate domains.
5. **Interactive Swagger Documentation**:
   - The live API docs remain accessible at `https://wanderplan-api.onrender.com/api/docs`.
