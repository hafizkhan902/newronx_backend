import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing MongoDB Connection...\n');

// Test connection configuration
const testConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  bufferCommands: false,
  retryWrites: true,
  retryReads: true
};

console.log('📋 Connection Configuration:');
console.log('   - URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');
console.log('   - Environment:', process.env.NODE_ENV || 'development');
console.log('   - Max Pool Size:', testConfig.maxPoolSize);
console.log('   - Min Pool Size:', testConfig.minPoolSize);
console.log('   - Timeout:', testConfig.serverSelectionTimeoutMS, 'ms');

// Test connection
async function testConnection() {
  try {
    console.log('\n🔌 Attempting to connect...');
    
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully!');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Attempt connection
    await mongoose.connect(process.env.MONGODB_URI, testConfig);
    
    console.log('🎉 Connection test successful!');
    console.log('📊 Connection details:');
    console.log('   - Database:', mongoose.connection.name);
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Port:', mongoose.connection.port);
    
    // Safely check pool properties
    if (mongoose.connection.pool) {
      console.log('   - Pool Size:', mongoose.connection.pool.size || 'N/A');
    } else {
      console.log('   - Pool Size: N/A (pool not available)');
    }
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections found:', collections.length);
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      message: error.message
    });
    
    // Provide troubleshooting tips
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting: Check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting: Check if MongoDB is running');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Troubleshooting: Check username/password in connection string');
    } else if (error.message.includes('IP whitelist')) {
      console.log('\n💡 Troubleshooting: Add your IP to MongoDB Atlas whitelist');
    }
  }
}

// Run the test
testConnection();
