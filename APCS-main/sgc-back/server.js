// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
require("dotenv").config();

const app = express();

// middlewares
app.use(express.json());
app.use(cors()); // dev: allow all origins. Restrict this in production.

// Import routes AFTER middlewares
const driverRoutes = require("./routes/driver");
const hospitalRoutes = require("./routes/hospital");
const tripRoutes = require("./routes/trips");

// Mount routes
app.use("/driver", driverRoutes);
app.use("/hospital", hospitalRoutes);
app.use("/trip", tripRoutes);

// Global store for hospital WebSocket clients
global.hospitalClients = {}; // { hospitalId: [ws1, ws2, ...] }

// Base route
app.get("/", (req, res) => {
  res.send("Smart Green Corridor Backend Running 🚑");
});

// Create HTTP server and attach WebSocket server to same port
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Helper: register ws to a hospital
function registerHospitalSocket(hospitalId, ws) {
  if (!hospitalId) return;
  if (!global.hospitalClients[hospitalId]) global.hospitalClients[hospitalId] = [];
  global.hospitalClients[hospitalId].push(ws);
  console.log(`🏥 Hospital ${hospitalId} registered for updates (total: ${global.hospitalClients[hospitalId].length})`);
}

// Clean-up helper
function cleanupSocket(ws) {
  for (const hospitalId in global.hospitalClients) {
    global.hospitalClients[hospitalId] = global.hospitalClients[hospitalId].filter((client) => client !== ws);
    if (global.hospitalClients[hospitalId].length === 0) {
      delete global.hospitalClients[hospitalId];
    }
  }
}

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  console.log("New WebSocket client connected ✅");

  // Try to auto-register if hospitalId provided as query param: ws://localhost:5000?hospitalId=H001
  try {
    const fullUrl = `http://localhost${req.url}`; // hack to parse query params
    const urlObj = new URL(fullUrl);
    const hospitalId = urlObj.searchParams.get("hospitalId");
    if (hospitalId) {
      registerHospitalSocket(hospitalId, ws);
      try { ws.send(JSON.stringify({ event: "welcome", message: `Registered for hospital ${hospitalId}` })); } catch (e) {}
    } else {
      try { ws.send(JSON.stringify({ event: "welcome", message: "Connected to Smart Green Corridor WS" })); } catch (e) {}
    }
  } catch (err) {
    // ignore parse errors
  }

  ws.on("message", (msg) => {
    // Messages expected in JSON like: { type: "register", role: "hospital", hospitalId: "H001" }
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "register" && data.role === "hospital" && data.hospitalId) {
        registerHospitalSocket(data.hospitalId, ws);
        try { ws.send(JSON.stringify({ event: "registered", hospitalId: data.hospitalId })); } catch (e) {}
      } else {
        // you can add more message handling here later (ping, driver messages etc.)
        console.log("WS message:", data);
      }
    } catch (err) {
      // not JSON — just log raw
      console.log("WS raw message:", msg.toString());
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    cleanupSocket(ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    cleanupSocket(ws);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
