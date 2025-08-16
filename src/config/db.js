import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Simplified and modern database configuration
const dbConfig = {
  // Essential connection settings
  useNewUrlParser: true,
  useUnifiedTopology: true,

  // Connection pooling optimization - INCREASED for better performance
  maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
  minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 2,

  // Timeout optimizations
  serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000, // Increased to 30 seconds

  // Performance optimizations
  bufferCommands: false,

  // Write concern optimization
  w: process.env.NODE_ENV === 'production' ? 'majority' : 1,

  // Read preference optimization
  readPreference: 'primaryPreferred',

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Monitoring (only in development)
  monitorCommands: process.env.NODE_ENV === 'development'
};

// Connection monitoring and optimization
const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    
    // Set up connection monitoring
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      logConnectionStats();
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Performance monitoring
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    // Connect with simplified configuration
    await mongoose.connect(process.env.MONGODB_URI, dbConfig);
    
    console.log(`🚀 MongoDB connected successfully with optimization (${process.env.NODE_ENV} mode)`);
    console.log(`📊 Connection pool: ${dbConfig.maxPoolSize} max, ${dbConfig.minPoolSize} min`);
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('🔍 Connection details:', {
      uri: process.env.MONGODB_URI ? 'Present' : 'Missing',
      env: process.env.NODE_ENV,
      config: dbConfig
    });
    process.exit(1);
  }
};

// Connection statistics logging
const logConnectionStats = async () => {
  try {
    // Safely check if connection and pool exist
    if (mongoose.connection && mongoose.connection.pool) {
      const pool = mongoose.connection.pool;
      console.log('📊 Database connection stats:', {
        poolSize: pool.size || 'N/A',
        available: pool.available || 'N/A',
        pending: pool.pending || 'N/A'
      });
    } else {
      console.log('📊 Database connected successfully');
    }
  } catch (error) {
    console.log('📊 Database connected successfully');
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during MongoDB shutdown:', err);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default connectDB;
export { dbConfig }; 