import { createServer } from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import initializeSocket from './socket.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
let io;
initializeSocket(server).then(socketIo => {
  io = socketIo;
  // Make io available to routes
  app.set('io', io);
  
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Worker: ${process.pid})`);
      console.log(`Socket.IO server initialized`);
    });
  });
}).catch(error => {
  console.error('Failed to initialize Socket.IO:', error);
  process.exit(1);
}); 