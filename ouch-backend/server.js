// server.js — Ouch. Backend
// Stack: Node.js + Express + Socket.io + Mongoose (MongoDB Atlas)
// Run: npm install && npm start

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// ─── CORS (autorise Vercel + local) ───────────────────────────────────────
const ALLOWED = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://ouch-one.vercel.app/",
  "http://localhost:5173",
];

app.use(cors({ origin: ALLOWED, credentials: true }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: ALLOWED, methods: ["GET", "POST"] },
});

// ─── MONGOOSE SCHEMAS ─────────────────────────────────────────────────────
const memberSchema = new mongoose.Schema({
  socketId: String,
  userId:   { type: String, required: true },
  name:     { type: String, required: true },
  avatar:   { type: String, default: "🐯" },
  color:    { type: String, default: "#FF5733" },
});

const roomSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true, index: true },
  categories: { type: [String], default: ["Général", "Daronne", "Skill issue", "Physique"] },
  members:    { type: [memberSchema], default: [] },
  stats:      { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt:  { type: Date, default: Date.now, expires: 86400 }, // TTL 24h
});

const Room = mongoose.model("Room", roomSchema);

// ─── HELPERS ──────────────────────────────────────────────────────────────
const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

// ─── REST ROUTES ──────────────────────────────────────────────────────────

// Health check (anti-sleep Render ping)
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Create room
app.post("/rooms", async (req, res) => {
  try {
    const { name, categories, userId, userName, userAvatar } = req.body;
    if (!name || !userId || !userName)
      return res.status(400).json({ error: "name, userId, userName requis" });

    const code = genCode();
    const room = await Room.create({
      name, inviteCode: code,
      categories: categories?.length ? categories : undefined,
      members: [{ userId, name: userName, avatar: userAvatar || "🐯", color: "#FF5733" }],
      stats: { [userId]: {} },
    });

    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get room by invite code
app.get("/rooms/:code", async (req, res) => {
  try {
    const room = await Room.findOne({ inviteCode: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: "Salon introuvable" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SOCKET.IO — TEMPS RÉEL ───────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 connected: ${socket.id}`);

  // Join a room by invite code
  socket.on("join_room", async ({ code, userId, userName, userAvatar }, ack) => {
    try {
      const room = await Room.findOne({ inviteCode: code.toUpperCase() });
      if (!room) return ack?.({ error: "Salon introuvable" });

      // Add or update member
      const existing = room.members.find(m => m.userId === userId);
      if (!existing) {
        room.members.push({ socketId: socket.id, userId, name: userName, avatar: userAvatar });
        if (!room.stats[userId]) room.stats[userId] = {};
        room.markModified("stats");
        await room.save();
      } else {
        existing.socketId = socket.id;
        await room.save();
      }

      socket.join(code);
      socket.data.roomCode = code;
      socket.data.userId   = userId;

      io.to(code).emit("room_updated", room);
      ack?.({ ok: true, room });
    } catch (err) {
      ack?.({ error: err.message });
    }
  });

  // Punch someone
  socket.on("punch", async ({ code, targetId, category }, ack) => {
    try {
      const room = await Room.findOne({ inviteCode: code.toUpperCase() });
      if (!room) return ack?.({ error: "Salon introuvable" });

      if (!room.stats[targetId])       room.stats[targetId] = {};
      if (!room.stats[targetId][category]) room.stats[targetId][category] = 0;
      room.stats[targetId][category]++;
      room.markModified("stats");
      await room.save();

      // Broadcast to everyone in the room (including sender)
      io.to(code).emit("punch_received", {
        targetId,
        category,
        stats: room.stats,
      });

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ error: err.message });
    }
  });

  // Leave room / disconnect
  socket.on("disconnecting", async () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = await Room.findOne({ inviteCode: code }).catch(() => null);
    if (!room) return;

    const member = room.members.find(m => m.socketId === socket.id);
    if (member) {
      io.to(code).emit("member_left", { userId: member.userId, name: member.name });
    }
  });
});

// ─── DB + START ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ouch";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connecté");
    httpServer.listen(PORT, () =>
      console.log(`🚀 Serveur sur http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error("❌ MongoDB erreur:", err.message);
    process.exit(1);
  });