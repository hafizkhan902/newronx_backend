import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import emailService from '../services/emailService.js';

// Initialize Google OAuth Strategy function
const initializeGoogleStrategy = () => {
  console.log('Checking Google OAuth credentials...');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Found' : 'Not found');
  console.log('GOOGLE_CLIENT_SECRETE:', process.env.GOOGLE_CLIENT_SECRETE ? 'Found' : 'Not found');
  console.log('CALLBACK_URL:', process.env.CALLBACK_URL);

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRETE) {
    console.log('Initializing Google OAuth strategy...');
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRETE,
      callbackURL: process.env.CALLBACK_URL || "http://localhost:2000/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // User exists, update last login
      console.log('Existing Google user found:', {
        id: user._id,
        email: user.email,
        avatar: user.avatar,
        hasAvatar: !!user.avatar
      });
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }
    
    // Check if user exists with same email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // User exists with email but no Google ID, link accounts
      console.log('Linking existing email user with Google account:', {
        userId: user._id,
        email: user.email,
        currentAvatar: user.avatar,
        googlePhotos: profile.photos?.length || 0
      });
      
      // Extract name components for potential updates
      const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
      let lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
      
      // If lastName is still empty, use a default
      if (!lastName) {
        lastName = 'User'; // Default lastName for Google users
      }
      
      const fullName = profile.displayName || `${firstName} ${lastName}`.trim() || 'Google User';

      user.googleId = profile.id;
      user.googleEmail = profile.emails[0].value;
      user.authProvider = 'google';
      user.emailVerified = true; // Google emails are verified
      user.lastLogin = new Date();
      
      // Update name fields if they're missing or could be improved
      if (!user.firstName || user.firstName === 'User') {
        user.firstName = firstName;
      }
      if (!user.lastName || user.lastName === '') {
        user.lastName = lastName;
      }
      if (!user.fullName || user.fullName === 'Google User') {
        user.fullName = fullName;
      }
      
      // Update avatar if user doesn't have one and Google provides one
      if (!user.avatar && profile.photos && profile.photos.length > 0) {
        user.avatar = profile.photos[0].value;
        console.log('Updated avatar for existing user:', user.avatar);
      }
      
      await user.save();
      
      // Send welcome email for newly linked Google accounts
      try {
        const emailResult = await emailService.sendWelcomeEmail(user);
        if (emailResult.success) {
          console.log('Welcome email sent to linked Google user:', user.email);
        } else {
          console.error('Failed to send welcome email to linked Google user:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Error sending welcome email to linked Google user:', emailError);
        // Don't fail the login process if email fails
      }
      
      return done(null, user);
    }
    
    // Debug profile data
    console.log('Google Profile Data:', {
      id: profile.id,
      displayName: profile.displayName,
      givenName: profile.name?.givenName,
      familyName: profile.name?.familyName,
      email: profile.emails?.[0]?.value,
      photos: profile.photos,
      photosLength: profile.photos?.length
    });

    // Extract name components from Google profile
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
    let lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
    
    // If lastName is still empty, use a default for Google users
    if (!lastName) {
      lastName = 'User'; // Default lastName for Google users
    }
    
    const fullName = profile.displayName || `${firstName} ${lastName}`.trim() || 'Google User';

    console.log('Extracted name components:', {
      firstName,
      lastName,
      fullName
    });

    // Get avatar URL from Google profile
    let avatarUrl = '';
    if (profile.photos && profile.photos.length > 0) {
      // Try to get the highest resolution image
      const photo = profile.photos[0];
      avatarUrl = photo.value;
      
      // If there's a larger version available, use it
      if (photo.value.includes('s96-c')) {
        avatarUrl = photo.value.replace('s96-c', 's400-c'); // Get larger version
      }
      
      console.log('Avatar URL found:', avatarUrl);
    } else {
      console.log('No avatar URL found in Google profile');
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      googleEmail: profile.emails[0].value,
      email: profile.emails[0].value,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      avatar: avatarUrl,
      authProvider: 'google',
      emailVerified: true, // Google emails are verified
      lastLogin: new Date()
    });
    
    await newUser.save();
    console.log('New Google user created:', {
      id: newUser._id,
      email: newUser.email,
      avatar: newUser.avatar,
      hasAvatar: !!newUser.avatar
    });

    // Send welcome email for new Google users
    try {
      const emailResult = await emailService.sendWelcomeEmail(newUser);
      if (emailResult.success) {
        console.log('Welcome email sent to new Google user:', newUser.email);
      } else {
        console.error('Failed to send welcome email to Google user:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending welcome email to Google user:', emailError);
      // Don't fail the login process if email fails
    }

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
  }));
  console.log('Google OAuth strategy registered successfully');
} else {
  console.log('Google OAuth credentials not found. Google login will be disabled.');
}
console.log('Passport configuration completed.');
};

// Export the initialization function
export { initializeGoogleStrategy };

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport; 