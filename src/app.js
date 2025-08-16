import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import passport, { initializeGoogleStrategy } from './config/passport.js';
console.log('Passport imported successfully');
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import ideaRoutes from './routes/idea.routes.js';
import chatRoutes from './routes/chat.routes.js';
import messageRoutes from './routes/message.routes.js';
import emailRoutes from './routes/email.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();
import { v2 as cloudinary } from 'cloudinary';

// Performance optimizations for single-core
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting for single-core optimization
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (higher for single-core)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Initialize Redis client for session store
let redisClient = null;
let redisStore = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(console.error);
    redisStore = new RedisStore({ client: redisClient });
    console.log('Redis session store configured');
  } catch (error) {
    console.warn('Redis not available for sessions:', error.message);
  }
}

(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: 'dysr0wotl', 
        api_key: '556186415216556', 
        api_secret: '<your_api_secret>' // Click 'View API Keys' above to copy your API secret
    });
    
    // Upload an image
     const uploadResult = await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       .catch((error) => {
           console.log(error);
       });
    
    console.log(uploadResult);
    
    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url('shoes', {
        fetch_format: 'auto',
        quality: 'auto'
    });
    
    console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url('shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    
    console.log(autoCropUrl);    
})();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log method, full path, status, duration, body, and cookies
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request Body:', req.body);
    }
    if (req.cookies && Object.keys(req.cookies).length > 0) {
      console.log('Cookies:', req.cookies);
    }
  });
  next();
});

// Configure CORS from .env
const corsOptions = {
  origin: process.env.CORS || '*',
  credentials: true,
};
app.use(cors(corsOptions));

// Session configuration for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: redisStore || undefined // Use Redis store if available
}));

// Initialize Google OAuth Strategy
initializeGoogleStrategy();

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => res.send('API is running'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notifications', notificationRoutes);

export default app; 