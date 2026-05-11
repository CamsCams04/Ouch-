# 💥 Ouch. — Setup Guide

## 🗂️ Structure du projet

```
ouch/
├── backend/          ← Node.js + Express + Socket.io
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/         ← React + Vite
    ├── src/
    │   └── App.jsx   ← Tout le front est ici
    ├── public/
    │   └── manifest.json
    └── package.json
```

---

## 🚀 Installation

### 1. Backend (Node.js)

```bash
mkdir ouch-backend && cd ouch-backend
# Copie server.js et package.json ici
npm install
```

Crée un fichier `.env` :
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/ouch
FRONTEND_URL=http://localhost:5173
PORT=4000
```

Démarrer :
```bash
npm start
# ou en dev
npm run dev
```

---

### 2. Frontend (React + Vite)

```bash
npm create vite@latest ouch-frontend -- --template react
cd ouch-frontend
npm install
npm install socket.io-client
```

Remplace `src/App.jsx` par le fichier fourni.

Crée `.env.local` :
```env
VITE_API_URL=http://localhost:4000
```

Démarrer :
```bash
npm run dev
```

---

### 3. Connecter Socket.io (côté React)

Dans `App.jsx`, ajoute en haut du fichier :

```js
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_API_URL);
```

Puis dans `PageDuel`, remplace la fonction `punch` par :
```js
const punch = (targetId) => {
  socket.emit("punch", { code: room.code, targetId, category: selectedCat });
  // animations locales comme avant
};

// Écoute les updates en temps réel
useEffect(() => {
  socket.on("punch_received", ({ stats }) => {
    setRoom(prev => ({ ...prev, stats }));
    // déclenche animations...
  });
  return () => socket.off("punch_received");
}, []);
```

---

## 🌐 Déploiement (Gratuit)

### Frontend → Vercel
```bash
npm run build
# Push sur GitHub → connecter sur vercel.com
# Variable d'env: VITE_API_URL=https://ton-backend.onrender.com
```

### Backend → Render
1. Push `server.js` + `package.json` sur GitHub
2. Nouveau Web Service sur render.com
3. Build command: `npm install`
4. Start command: `npm start`
5. Variables d'env: `MONGO_URI`, `FRONTEND_URL`

---

## 📱 PWA — Ajouter à l'écran d'accueil

Dans `public/manifest.json` :
```json
{
  "name": "Ouch.",
  "short_name": "Ouch.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1A1A1A",
  "theme_color": "#FF5733",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Dans `index.html` :
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#FF5733" />
```

---

## ⚡ Anti-sleep Render (gratuit)

Le backend Render s'endort après 15 min d'inactivité.
Ajoute ça dans ton front (App.jsx) :

```js
useEffect(() => {
  // Ping toutes les 13 min pour garder le serveur éveillé
  const keepAlive = setInterval(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {});
  }, 13 * 60 * 1000);
  return () => clearInterval(keepAlive);
}, []);
```

---

## 🔌 Events Socket.io

| Émis par le client | Payload | Réponse serveur |
|---|---|---|
| `join_room` | `{ code, userId, userName, userAvatar }` | `room_updated` |
| `punch` | `{ code, targetId, category }` | `punch_received` |

| Émis par le serveur | Payload |
|---|---|
| `room_updated` | `Room` complet |
| `punch_received` | `{ targetId, category, stats }` |
| `member_left` | `{ userId, name }` |