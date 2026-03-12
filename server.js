// server.js — Vercel-compatible version

require("dotenv").config();
const path = require("path");
const fs = require("fs");

// Import your API handlers
const chatHandler = require("./api/chat");
const logsHandler = require("./api/logs");

// Serve static frontend files
const PUBLIC_DIR = path.join(__dirname, "public");

// Helper to serve index.html for SPA routing
function serveIndex(req, res) {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.setHeader("Content-Type", "text/html");
    res.status(200).sendFile(indexPath);
  } else {
    res.status(404).send("index.html not found");
  }
}

// Exported functions for Vercel
module.exports = {
  chat: async (req, res) => {
    // Only POST allowed
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    await chatHandler(req, res);
  },

  logs: async (req, res) => {
    // Only GET allowed
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    await logsHandler(req, res);
  },

  frontend: async (req, res) => {
    serveIndex(req, res);
  },
};