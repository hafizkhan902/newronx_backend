import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleEmail: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  emailVerificationOTP: {
    code: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  phone: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    }
  },
  bio: {
    type: String,
    default: 'Add bio here...'
  },
  avatar: {
    type: String,
    default: ''
  },
  avatarType: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  socialLinks: [
    {
      type: {
        type: String,
        required: true
      },
      value: {
        type: String,
        required: true
      }
    }
  ],
  status: {
    type: String,
    default: 'active'
  },
  interestedRoles: {
    type: [String],
    default: []
  },
  // New fields for investor/mentor roles
  isInvestor: {
    type: Boolean,
    default: false
  },
  isMentor: {
    type: Boolean,
    default: false
  },
  // Additional profile fields
  company: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  investmentFocus: {
    type: [String],
    default: []
  },
  mentorshipAreas: {
    type: [String],
    default: []
  },
  // Privacy settings
  privacy: {
    profileProtection: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public'
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    }
  },
  // NDA & Idea Protection
  nda: {
    hasNDA: {
      type: Boolean,
      default: false
    },
    ndaType: {
      type: String,
      enum: ['uploaded', 'generated', 'none'],
      default: 'none'
    },
    ndaFile: {
      type: String,
      default: ''
    },
    ndaGeneratedContent: {
      type: String,
      default: ''
    },
    ndaGeneratedAt: {
      type: Date
    },
    ideaProtection: {
      type: Boolean,
      default: false
    }
  },
  // Notification settings
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      preferences: {
        messages: {
          type: Boolean,
          default: true
        },
        ideaCollaboration: {
          type: Boolean,
          default: true
        },
        comments: {
          type: Boolean,
          default: true
        },
        likes: {
          type: Boolean,
          default: true
        },
        groupChats: {
          type: Boolean,
          default: true
        },
        connectionRequests: {
          type: Boolean,
          default: true
        },
        weeklyDigest: {
          type: Boolean,
          default: false
        }
      }
    },
    app: {
      enabled: {
        type: Boolean,
        default: false
      },
      browserPermission: {
        type: String,
        enum: ['granted', 'denied', 'default'],
        default: 'default'
      },
      preferences: {
        messages: {
          type: Boolean,
          default: true
        },
        ideaCollaboration: {
          type: Boolean,
          default: true
        },
        comments: {
          type: Boolean,
          default: true
        },
        likes: {
          type: Boolean,
          default: true
        },
        groupChats: {
          type: Boolean,
          default: true
        },
        connectionRequests: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  // Theme settings
  theme: {
    mode: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    accentColor: {
      type: String,
      default: '#3B82F6' // Blue
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    reducedMotion: {
      type: Boolean,
      default: false
    }
  },
  resume: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// ===== DATABASE OPTIMIZATION: COMPREHENSIVE INDEXING =====

// Primary indexes for unique fields
userSchema.index({ email: 1 }, { unique: true, background: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true, background: true });
userSchema.index({ googleEmail: 1 }, { unique: true, sparse: true, background: true });

// Performance indexes for frequently queried fields
userSchema.index({ authProvider: 1, emailVerified: 1 }, { background: true });
userSchema.index({ createdAt: -1 }, { background: true }); // For sorting by registration date
userSchema.index({ updatedAt: -1 }, { background: true }); // For sorting by last update

// Search and discovery indexes
userSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  fullName: 'text', 
  bio: 'text',
  skills: 'text',
  address: 'text'
}, { 
  name: 'user_search_index',
  weights: {
    firstName: 10,
    lastName: 10,
    fullName: 8,
    bio: 5,
    skills: 7,
    address: 3
  },
  background: true 
});

// Compound indexes for complex queries
userSchema.index({ 
  authProvider: 1, 
  emailVerified: 1, 
  createdAt: -1 
}, { background: true });

userSchema.index({ 
  skills: 1, 
  authProvider: 1, 
  emailVerified: 1 
}, { background: true });

userSchema.index({ 
  'privacy.profileVisibility': 1, 
  emailVerified: 1 
}, { background: true });

// Geospatial index for location-based queries (if implementing location features)
// userSchema.index({ location: '2dsphere' }, { background: true });

// Partial indexes for conditional queries
userSchema.index(
  { emailVerified: 1, createdAt: -1 },
  { 
    partialFilterExpression: { emailVerified: true },
    background: true 
  }
);

userSchema.index(
  { 'privacy.profileVisibility': 1, skills: 1 },
  { 
    partialFilterExpression: { 'privacy.profileVisibility': 'public' },
    background: true 
  }
);

// ===== QUERY OPTIMIZATION: VIRTUAL FIELDS =====

// Virtual for full name (computed field)
userSchema.virtual('displayName').get(function() {
  return this.fullName || `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for profile completeness score
userSchema.virtual('profileCompleteness').get(function() {
  const fields = ['firstName', 'lastName', 'bio', 'avatar', 'skills', 'address'];
  const completed = fields.filter(field => this[field] && 
    (Array.isArray(this[field]) ? this[field].length > 0 : this[field].toString().trim() !== '')
  ).length;
  return Math.round((completed / fields.length) * 100);
});

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
});

// ===== PERFORMANCE OPTIMIZATION: MIDDLEWARE =====

// Pre-save middleware for data optimization
userSchema.pre('save', function(next) {
  // Auto-generate fullName if not provided
  if (!this.fullName && this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
  
  // Normalize email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Normalize phone
  if (this.phone) {
    this.phone = this.phone.replace(/\D/g, ''); // Remove non-digits
  }
  
  // Update timestamps
  this.updatedAt = new Date();
  
  next();
});

// Pre-find middleware for query optimization
userSchema.pre('find', function() {
  // Add default sorting for better performance
  if (!this._mongooseOptions.sort) {
    this.sort({ createdAt: -1 });
  }
});

// Pre-findOne middleware for query optimization
userSchema.pre('findOne', function() {
  // Add default projection for better performance
  if (!this._mongooseOptions.projection) {
    this.select('-password -emailVerificationOTP -__v');
  }
});

// ===== STATIC METHODS FOR OPTIMIZED QUERIES =====

// Find users by skills with pagination
userSchema.statics.findBySkills = function(skills, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  
  return this.find({
    skills: { $in: skills },
    'privacy.profileVisibility': 'public',
    emailVerified: true
  })
  .select('-password -emailVerificationOTP -__v')
  .sort(sort)
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// Find users for collaboration
userSchema.statics.findCollaborators = function(excludeUserId, criteria = {}) {
  return this.find({
    _id: { $ne: excludeUserId },
    'privacy.profileVisibility': 'public',
    emailVerified: true,
    'privacy.ideaCollaboration': true,
    ...criteria
  })
  .select('-password -emailVerificationOTP -__v')
  .sort({ 'profileCompleteness': -1, createdAt: -1 })
  .lean();
};

// Search users with text search
userSchema.statics.searchUsers = function(searchTerm, options = {}) {
  const { page = 1, limit = 10, filters = {} } = options;
  
  const searchQuery = {
    $text: { $search: searchTerm },
    'privacy.profileVisibility': 'public',
    emailVerified: true,
    ...filters
  };
  
  return this.find(searchQuery)
  .select('-password -emailVerificationOTP -__v')
  .sort({ score: { $meta: 'textScore' } })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// ===== INSTANCE METHODS FOR OPTIMIZED OPERATIONS =====

// Update profile with validation
userSchema.methods.updateProfile = async function(updates) {
  const allowedUpdates = [
    'firstName', 'lastName', 'bio', 'avatar', 'skills', 
    'address', 'phone', 'socialLinks', 'theme'
  ];
  
  const filteredUpdates = {};
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  });
  
  Object.assign(this, filteredUpdates);
  return await this.save();
};

// Add skill with deduplication
userSchema.methods.addSkill = async function(skill) {
  if (!this.skills.includes(skill)) {
    this.skills.push(skill);
    return await this.save();
  }
  return this;
};

// Remove skill
userSchema.methods.removeSkill = async function(skill) {
  this.skills = this.skills.filter(s => s !== skill);
  return await this.save();
};

const User = mongoose.model('User', userSchema);

export default User; 