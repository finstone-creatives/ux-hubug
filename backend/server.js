require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const socketManager = require('./socket');

const app = express();
const frontendPath = path.join(__dirname, '../frontend');

// Serve frontend static files
app.use(express.static(frontendPath));

// Connect DB
connectDB();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,https://ux-hub.onrender.com').split(',').map(origin => origin.trim()).filter(Boolean);
if (!allowedOrigins.includes('http://localhost:5500')) allowedOrigins.push('http://localhost:5500');
if (!allowedOrigins.includes('http://127.0.0.1:5500')) allowedOrigins.push('http://127.0.0.1:5500');
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts.' });

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

const uploadDir = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, process.env.UPLOAD_PATH)
  : path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Static files (uploads)
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/live', require('./routes/live'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'UX-HUB API running ✅' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON received:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }
  console.error(err.stack || err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

// create HTTP server and attach socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

// Socket auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || '').split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    // ignore auth failure for now; socket can still connect but won't be associated with a user
    next();
  }
});

// Track live stream rooms and viewer counts
const liveRooms = new Map(); // liveId -> { viewers: Set, creatorId: string }

io.on('connection', (socket) => {
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }
  
  // Conversation chat
  socket.on('join:conversation', (convId) => {
    socket.join(`conversation:${convId}`);
  });
  socket.on('leave:conversation', (convId) => {
    socket.leave(`conversation:${convId}`);
  });
  
  // Live stream chat
  socket.on('live:join', ({ liveId }) => {
    socket.liveId = liveId;
    socket.join(`live:${liveId}`);
    
    // Track viewer
    if (!liveRooms.has(liveId)) {
      liveRooms.set(liveId, { viewers: new Set(), creatorId: null });
    }
    const room = liveRooms.get(liveId);
    room.viewers.add(socket.id);
    
    // Broadcast viewer count update
    io.to(`live:${liveId}`).emit('live:viewerUpdate', { 
      liveId, 
      count: room.viewers.size 
    });
  });
  
  socket.on('live:message', ({ liveId, text, username }) => {
    // Broadcast message to all viewers except sender
    socket.to(`live:${liveId}`).emit('live:message', {
      liveId,
      text: text.slice(0, 200), // Limit message length
      username: username || 'Anonymous',
      userId: socket.userId,
      timestamp: Date.now()
    });
  });
  
  socket.on('live:tip', ({ liveId, amount, message, username }) => {
    // Broadcast tip to all viewers
    io.to(`live:${liveId}`).emit('live:tip', {
      liveId,
      amount,
      message: message?.slice(0, 100),
      username: username || 'Someone'
    });
  });
  
  socket.on('disconnect', () => {
    // Remove from live room if applicable
    if (socket.liveId && liveRooms.has(socket.liveId)) {
      const room = liveRooms.get(socket.liveId);
      room.viewers.delete(socket.id);
      
      // Clean up empty rooms
      if (room.viewers.size === 0) {
        liveRooms.delete(socket.liveId);
      } else {
        // Broadcast updated viewer count
        io.to(`live:${socket.liveId}`).emit('live:viewerUpdate', { 
          liveId: socket.liveId, 
          count: room.viewers.size 
        });
      }
    }
  });
});

socketManager.setIO(io);

server.listen(PORT, () => console.log(`🚀 UX-HUB Server running on port ${PORT}`));

module.exports = app;
