import mongoose from 'mongoose';

// Sub-schema for image attachments
const imageSchema = new mongoose.Schema({
  url: String,
  contentType: String,
  size: Number
});

// Sub-schema for document attachments
const documentSchema = new mongoose.Schema({
  url: String,
  filename: String,
  contentType: String,
  size: Number
});

// Sub-schema for collaborators
const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  role: String,
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Sub-schema for approaches
const approachSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Main idea schema
const ideaSchema = new mongoose.Schema({
  // Core Fields (Required)
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  privacy: {
    type: String,
    enum: ['Public', 'Team', 'Private'],
    default: 'Public'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // NDA Protection
  ndaProtection: {
    enabled: {
      type: Boolean,
      default: false
    },
    requiresNDA: {
      type: Boolean,
      default: false
    },
    ndaMessage: {
      type: String,
      default: 'This idea is protected by NDA. Please sign the NDA to view full details.'
    },
    blurContent: {
      type: Boolean,
      default: true
    }
  },

  // Idea Details (Optional but Important)
  targetAudience: {
    type: String,
    trim: true
  },
  marketAlternatives: {
    type: String,
    trim: true
  },
  problemStatement: {
    type: String,
    trim: true
  },
  uniqueValue: {
    type: String,
    trim: true
  },
  neededRoles: [{
    type: String,
    trim: true
  }],

  // Media Attachments (Optional)
  images: [imageSchema],
  pitch: {
    type: String,
    trim: true
  },
  documents: [documentSchema],

  // Metadata (Auto-generated)
  status: {
    type: String,
    enum: ['draft', 'published', 'live'],
    default: 'draft'
  },
  appreciateCount: {
    type: Number,
    default: 0
  },
  proposeCount: {
    type: Number,
    default: 0
  },
  suggestCount: {
    type: Number,
    default: 0
  },

  // Engagement Fields (Auto-managed)
  tags: [{
    type: String,
    trim: true
  }],
  collaborators: [collaboratorSchema],
  approaches: [approachSchema],
  team: {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'  // Assuming you'll have a Team model
    },
    accessLevel: {
      type: String,
      enum: ['public', 'team-only', 'private'],
      default: 'public'
    }
  },

  // Additional tracking fields
  appreciatedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  proposals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  suggestions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    text: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ndaSignings: [{
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea'
    },
    ideaTitle: String,
    signedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      firstName: String,
      fullName: String,
      email: String
    },
    signedAt: {
      type: Date,
      default: Date.now
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['signed', 'pending', 'expired'],
      default: 'signed'
    }
  }]
}, {
  timestamps: true  // Automatically handles createdAt and updatedAt
});

// Add text index for search (title, description, tags, proposals.message, suggestions.content, targetAudience, marketAlternatives, problemStatement, uniqueValue)
ideaSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  'proposals.message': 'text',
  'suggestions.content': 'text',
  targetAudience: 'text',
  marketAlternatives: 'text',
  problemStatement: 'text',
  uniqueValue: 'text'
});

// Middleware to update counts
ideaSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.appreciateCount = this.likes.length;
  }
  if (this.isModified('appreciatedBy')) {
    this.appreciateCount = this.appreciatedBy.length;
  }
  if (this.isModified('proposals')) {
    this.proposeCount = this.proposals.length;
  }
  if (this.isModified('suggestions')) {
    this.suggestCount = this.suggestions.length;
  }
  next();
});

// Virtual for checking if idea is appreciated by a user
ideaSchema.virtual('isAppreciatedBy').get(function(userId) {
  return this.appreciatedBy.includes(userId);
});

const Idea = mongoose.model('Idea', ideaSchema);

export default Idea; 