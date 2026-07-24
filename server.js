'use strict';

/*
 * Kahoot Offline - entry point.
 *
 * Serves the static frontend and wires up Socket.io for real-time
 * multiplayer over the local network (Android hotspot / LAN).
 *
 * No internet access is required at runtime. Everything is served
 * from this single Node.js process.
 */

const path = require('path');
const os = require('os');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const registerSocketHandlers = require('./src/socketHandlers');
const GameManager = require('./src/gameManager');

const PORT = process.env.PORT || 5000;
// Bind to 0.0.0.0 so devices on the hotspot/LAN can reach the server.
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  // Generous timeouts: mobile browsers throttle background tabs and
  // screens go to sleep. We want players to survive brief disconnects.
  pingInterval: 20000,
  pingTimeout: 25000,
  // No CORS restriction needed on a private LAN; keep it permissive so
  // players hitting the raw IP work without fuss.
  cors: { origin: '*' },
  // Allow larger payloads for base64 images/GIFs embedded in questions.
  maxHttpBufferSize: 1e7 // 10 MB
});

// Serve the frontend.
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Tiny health/info endpoint (handy for debugging on the phone).
app.get('/api/info', (req, res) => {
  res.json({
    ok: true,
    time: Date.now(),
    addresses: getLocalAddresses()
  });
});

// Single shared game manager instance.
const manager = new GameManager();
registerSocketHandlers(io, manager);

server.listen(PORT, HOST, () => {
  const addresses = getLocalAddresses();
  console.log('');
  console.log('  ┌───────────────────────────────────────────────┐');
  console.log('  │   Kahoot Offline  —  server pornit             │');
  console.log('  └───────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Port: ${PORT}`);
  console.log('  Deschide în browser una dintre adresele:');
  if (addresses.length === 0) {
    console.log(`    -> http://localhost:${PORT}`);
  } else {
    addresses.forEach((ip) => console.log(`    -> http://${ip}:${PORT}`));
  }
  console.log('');
  console.log('  Host-ul deschide "/host", jucătorii deschid adresa de mai sus.');
  console.log('');
});

/**
 * Returns the list of non-internal IPv4 addresses of this machine.
 * On an Android hotspot this typically includes 192.168.43.1.
 */
function getLocalAddresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

// Graceful shutdown so PINs/timers don't leak on Ctrl+C in Termux.
function shutdown() {
  console.log('\n  Se oprește serverul...');
  manager.destroyAll();
  io.close();
  server.close(() => process.exit(0));
  // Force-exit if something hangs.
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
