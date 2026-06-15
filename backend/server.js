require('dotenv').config();
const fs      = require('fs');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const http    = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const jwt     = require('jsonwebtoken');
const socketManager = require('./socket');

const app = express();
const frontendPath = path.join(__dirname, '../frontend');

// Serve frontend static files
app.use(express.static(frontendPath));

connectDB();

app.use(helmet({ crossOriginResourcePolicy: false }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,https://nxt-door.onrender.com')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

['http://localhost:5500','http://127.0.0.1:5500','http://localhost:3000'].forEach(o => {
  if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
});

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter     = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts.' });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Uploads directory
const uploadDir = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, process.env.UPLOAD_PATH)
  : path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/stats',         require('./routes/stats'));
app.use('/api/videos',        require('./routes/videos'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/posts',         require('./routes/posts'));

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  app: 'Nxt-door API',
  version: '2.1.0',
  timestamp: new Date().toISOString(),
}));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }
  console.error(err.stack || err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
      || (socket.handshake.headers?.authorization || '').split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch { next(); }
});

io.on('connection', (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);

  socket.on('join:conversation',  id => socket.join(`conv:${id}`));
  socket.on('leave:conversation', id => socket.leave(`conv:${id}`));
  socket.on('join:live',          id => socket.join(`live:${id}`));
  socket.on('leave:live',         id => socket.leave(`live:${id}`));

  socket.on('typing',      ({ convId, username }) => socket.to(`conv:${convId}`).emit('typing', { username }));
  socket.on('stop:typing', ({ convId })           => socket.to(`conv:${convId}`).emit('stop:typing'));
});

socketManager.setIO(io);

server.listen(PORT, () => console.log(`\u{1F680} Nxt-door API running on port ${PORT}`));
module.exports = app;
