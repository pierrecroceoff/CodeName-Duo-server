const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

// Health check endpoint for hosting services like Render
app.get('/', (req, res) => {
  res.send('CO-OP SPIES Server is Running');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://gorgeous-hummingbird-a428ee.netlify.app/", // Votre URL Netlify pour CORS
    methods: ["GET", "POST"]
  }
});

// In-memory storage (Reset on server restart)
// Structure: { roomId: { state: GameState, players: { P1: {name, id}, P2: {name, id} }, lastActive: number } }
const rooms = {};

// Clean up old rooms every hour
setInterval(() => {
    const now = Date.now();
    for (const [id, room] of Object.entries(rooms)) {
        if (now - room.lastActive > 3600000) { // 1 hour inactivity
            delete rooms[id];
        }
    }
}, 3600000);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ hostName, initialState }, callback) => {
    // Generate 4-char code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let roomId = "";
    do {
        roomId = "";
        for(let i=0; i<4; i++) roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    } while (rooms[roomId]);

    // Initialize Room
    rooms[roomId] = {
        state: initialState,
        players: {
            P1: { name: hostName, connected: true, socketId: socket.id },
            P2: { name: "", connected: false, socketId: null }
        },
        lastActive: Date.now()
    };

    socket.join(roomId);
    
    console.log(`Room ${roomId} created by ${hostName}`);
    
    // Acknowledge
    if (callback) callback({ success: true, roomId });
  });

  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const room = rooms[roomId];
    
    if (!room) {
        if (callback) callback({ success: false, error: "Salon introuvable" });
        return;
    }

    if (room.players.P2.connected) {
        if (callback) callback({ success: false, error: "Salon complet" });
        return;
    }

    // Update Room
    room.players.P2 = { name: playerName, connected: true, socketId: socket.id };
    room.state.p2Name = playerName;
    room.lastActive = Date.now();

    socket.join(roomId);
    
    console.log(`Player ${playerName} joined room ${roomId}`);

    // Notify everyone in room (including sender)
    io.to(roomId).emit('game_updated', { 
        state: room.state, 
        players: { P1: { connected: true }, P2: { connected: true } } 
    });

    if (callback) callback({ success: true });
  });

  socket.on('update_game_state', ({ roomId, updates }) => {
    const room = rooms[roomId];
    if (room) {
        // Merge state
        room.state = { ...room.state, ...updates };
        room.lastActive = Date.now();