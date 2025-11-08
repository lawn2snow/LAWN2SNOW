const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/caribbean-game', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Caribbean Crypto Game API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      player: '/api/player',
      missions: '/api/missions',
      pvp: '/api/pvp',
      blockchain: '/api/blockchain',
      marketplace: '/api/marketplace'
    }
  });
});

// Import routes (to be created)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/player', require('./routes/player'));
// app.use('/api/missions', require('./routes/missions'));
// app.use('/api/pvp', require('./routes/pvp'));
// app.use('/api/blockchain', require('./routes/blockchain'));
// app.use('/api/marketplace', require('./routes/marketplace'));

// WebSocket for real-time PvP
io.on('connection', (socket) => {
  console.log('🎮 Player connected:', socket.id);

  // Handle player join
  socket.on('player:join', (data) => {
    console.log('Player joined:', data);
    socket.join(`island:${data.island}`);
    io.to(`island:${data.island}`).emit('player:joined', {
      playerId: data.playerId,
      username: data.username
    });
  });

  // Handle PvP attack
  socket.on('pvp:attack', async (data) => {
    console.log('PvP attack:', data);

    // Validate attack (implement in services)
    // const result = await pvpService.processAttack(data);

    // Notify both players
    socket.emit('pvp:result', { success: true, message: 'Attack processed' });
  });

  // Handle mission completion
  socket.on('mission:complete', async (data) => {
    console.log('Mission completed:', data);

    // Validate and reward (implement in services)
    // const reward = await missionService.completeMission(data);

    socket.emit('mission:reward', { success: true });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('👋 Player disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Caribbean Game API running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
