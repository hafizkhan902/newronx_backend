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

const User = mongoose.model('User', userSchema);

export default User; 