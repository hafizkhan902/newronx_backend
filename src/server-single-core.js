import { createServer } from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import initializeSocket from './socket.js';

const PORT = process.env.PORT || 5000;

// Single-core optimized server
const server = createServer(app);

// Optimize for single-core performance
server.maxConnections = 1000; // Limit concurrent connections
server.keepAliveTimeout = 65000; // Keep connections alive longer
server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

// Initialize Socket.IO with single-core optimizations
let io;
initializeSocket(server).then(socketIo => {
  io = socketIo;
  
  // Single-core socket optimizations
  io.engine.maxHttpBufferSize = 1e6; // 1MB max message size
  io.engine.pingTimeout = 60000;
  io.engine.pingInterval = 25000;
  
  // Make io available to routes
  app.set('io', io);
  
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Single-core optimized server running on port ${PORT}`);
      console.log(`📊 Max connections: ${server.maxConnections}`);
      console.log(`⚡ Socket.IO server initialized`);
      console.log(`💡 Optimized for 1 CPU core`);
    });
  });
}).catch(error => {
  console.error('Failed to initialize Socket.IO:', error);
  process.exit(1);
});

// Graceful shutdown for single-core
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
}); 