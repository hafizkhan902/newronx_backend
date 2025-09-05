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
  status: {
    type: String,
    enum: ['pending', 'selected', 'declined', 'queued'],
    default: 'pending'
  },
  statusUpdatedAt: {
    type: Date,
    default: null
  },
  statusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Sub-schema for team roles needed
const roleNeededSchema = new mongoose.Schema({
  roleType: {
    type: String,
    required: true,
    trim: true
  },
  normalizedRoleType: {
    type: String,
    required: true,
    lowercase: true
  },
  isCore: {
    type: Boolean,
    default: true
  },
  parentRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoleDefinition',
    default: null
  },
  maxPositions: {
    type: Number,
    default: 1,
    min: 1
  },
  currentPositions: {
    type: Number,
    default: 0,
    min: 0
  },
  priority: {
    type: Number,
    enum: [1, 2, 3], // 1=Critical, 2=Important, 3=Nice-to-have
    default: 2
  },
  skillsRequired: [String],
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Sub-schema for team composition
const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedRole: {
    type: String,
    required: true,
    trim: true
  },
  roleType: {
    type: String,
    required: true,
    trim: true
  },
  normalizedRoleType: {
    type: String,
    required: true,
    lowercase: true
  },
  isLead: {
    type: Boolean,
    default: false
  },
  parentRoleId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'removed'],
    default: 'active'
  }
}, { _id: true });

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
  
  // Enhanced Team Structure Management
  teamStructure: {
    maxTeamSize: {
      type: Number,
      default: function() {
        return this.rolesNeeded ? this.rolesNeeded.length + 1 : 6; // +1 for author
      }
    },
    currentTeamSize: {
      type: Number,
      default: 1 // Author counts as 1
    },
    rolesNeeded: [roleNeededSchema],
    teamComposition: [teamMemberSchema],
    isTeamComplete: {
      type: Boolean,
      default: false
    },
    teamFormationDate: {
      type: Date,
      default: null
    },
    lastTeamUpdate: {
      type: Date,
      default: Date.now
    }
  },

  team: {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'  // Legacy field - keeping for backward compatibility
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

// ===== ADVANCED DATABASE OPTIMIZATION: COMPREHENSIVE INDEXING =====

// Primary performance indexes
ideaSchema.index({ author: 1, createdAt: -1 }, { background: true }); // User's ideas
ideaSchema.index({ privacy: 1, createdAt: -1 }, { background: true }); // Public ideas by date
ideaSchema.index({ status: 1, createdAt: -1 }, { background: true }); // Ideas by status

// Compound indexes for complex queries
ideaSchema.index({ 
  privacy: 1, 
  status: 1, 
  createdAt: -1 
}, { background: true });

ideaSchema.index({ 
  tags: 1, 
  privacy: 1, 
  createdAt: -1 
}, { background: true });

ideaSchema.index({ 
  author: 1, 
  privacy: 1, 
  status: 1 
}, { background: true });

// Performance indexes for frequently accessed fields
ideaSchema.index({ appreciateCount: -1 }, { background: true }); // Trending ideas
ideaSchema.index({ proposeCount: -1 }, { background: true }); // Most proposed ideas
ideaSchema.index({ suggestCount: -1 }, { background: true }); // Most suggested ideas
ideaSchema.index({ viewCount: -1 }, { background: true }); // Most viewed ideas

// NDA and collaboration indexes
ideaSchema.index({ 
  'ndaProtection.enabled': 1, 
  privacy: 1 
}, { background: true });

ideaSchema.index({ 
  'ndaProtection.requiresNDA': 1, 
  privacy: 1 
}, { background: true });

// Time-based indexes for analytics
ideaSchema.index({ 
  createdAt: 1, 
  privacy: 1 
}, { background: true });

ideaSchema.index({ 
  updatedAt: -1, 
  privacy: 1 
}, { background: true });

// Partial indexes for conditional queries
ideaSchema.index(
  { privacy: 1, status: 1, createdAt: -1 },
  { 
    partialFilterExpression: { privacy: 'Public', status: 'active' },
    background: true 
  }
);

ideaSchema.index(
  { tags: 1, privacy: 1, createdAt: -1 },
  { 
    partialFilterExpression: { privacy: 'Public' },
    background: true 
  }
);

// ===== QUERY OPTIMIZATION: STATIC METHODS =====

// Find trending ideas with pagination
ideaSchema.statics.findTrending = function(options = {}) {
  const { page = 1, limit = 10, timeRange = '7d' } = options;
  
  const dateFilter = getDateFilter(timeRange);
  
  return this.find({
    privacy: 'Public',
    status: 'active',
    createdAt: dateFilter
  })
  .sort({ appreciateCount: -1, viewCount: -1, createdAt: -1 })
  .select('-__v')
  .populate('author', 'firstName lastName fullName avatar')
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// Find ideas by tags with pagination
ideaSchema.statics.findByTags = function(tags, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  
  return this.find({
    tags: { $in: tags },
    privacy: 'Public',
    status: 'active'
  })
  .sort(sort)
  .select('-__v')
  .populate('author', 'firstName lastName fullName avatar')
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// Search ideas with advanced filters
ideaSchema.statics.searchIdeas = function(searchTerm, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    filters = {}, 
    sort = { score: { $meta: 'textScore' } } 
  } = options;
  
  const searchQuery = {
    $text: { $search: searchTerm },
    privacy: 'Public',
    status: 'active',
    ...filters
  };
  
  return this.find(searchQuery)
  .sort(sort)
  .select('-__v')
  .populate('author', 'firstName lastName fullName avatar')
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// Find user's ideas with privacy filtering
ideaSchema.statics.findUserIdeas = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    privacy = null, 
    status = null,
    sort = { createdAt: -1 } 
  } = options;
  
  const query = { author: userId };
  if (privacy) query.privacy = privacy;
  if (status) query.status = status;
  
  return this.find(query)
  .sort(sort)
  .select('-__v')
  .populate('author', 'firstName lastName fullName avatar')
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
};

// Get idea statistics for analytics
ideaSchema.statics.getStats = async function(userId = null) {
  const matchStage = userId ? { author: userId } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalIdeas: { $sum: 1 },
        publicIdeas: { $sum: { $cond: [{ $eq: ['$privacy', 'Public'] }, 1, 0] } },
        privateIdeas: { $sum: { $cond: [{ $eq: ['$privacy', 'Private'] }, 1, 0] } },
        teamIdeas: { $sum: { $cond: [{ $eq: ['$privacy', 'Team'] }, 1, 0] } },
        totalAppreciations: { $sum: '$appreciateCount' },
        totalProposals: { $sum: '$proposeCount' },
        totalSuggestions: { $sum: '$suggestCount' },
        totalViews: { $sum: '$viewCount' },
        averageAppreciations: { $avg: '$appreciateCount' },
        averageViews: { $avg: '$viewCount' }
      }
    }
  ]);
  
  return stats[0] || {};
};

// ===== HELPER FUNCTIONS =====

function getDateFilter(timeRange) {
  const now = new Date();
  const ranges = {
    '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  };
  
  return { $gte: ranges[timeRange] || ranges['7d'] };
}

// ===== PERFORMANCE OPTIMIZATION: MIDDLEWARE =====

// Pre-save middleware for data optimization
ideaSchema.pre('save', function(next) {
  // Auto-generate title slug if not provided
  if (this.title && !this.titleSlug) {
    this.titleSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Update counts
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
  
  // Update timestamps
  this.updatedAt = new Date();
  
  next();
});

// Pre-find middleware for query optimization
ideaSchema.pre('find', function() {
  // Add default sorting for better performance
  if (!this._mongooseOptions.sort) {
    this.sort({ createdAt: -1 });
  }
});

// Pre-findOne middleware for query optimization
ideaSchema.pre('findOne', function() {
  // Add default projection for better performance
  if (!this._mongooseOptions.projection) {
    this.select('-__v');
  }
});

// ===== INSTANCE METHODS FOR OPTIMIZED OPERATIONS =====

// Increment view count
ideaSchema.methods.incrementView = async function() {
  this.viewCount = (this.viewCount || 0) + 1;
  return await this.save();
};

// Add appreciation
ideaSchema.methods.addAppreciation = async function(userId) {
  if (!this.appreciatedBy.includes(userId)) {
    this.appreciatedBy.push(userId);
    this.appreciateCount = this.appreciatedBy.length;
    return await this.save();
  }
  return this;
};

// Remove appreciation
ideaSchema.methods.removeAppreciation = async function(userId) {
  this.appreciatedBy = this.appreciatedBy.filter(id => id.toString() !== userId.toString());
  this.appreciateCount = this.appreciatedBy.length;
  return await this.save();
};

// Add tag with deduplication
ideaSchema.methods.addTag = async function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return await this.save();
  }
  return this;
};

// Remove tag
ideaSchema.methods.removeTag = async function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return await this.save();
};

// Team management methods
ideaSchema.methods.checkRoleConflict = function(requestedRole) {
  const normalizedRole = requestedRole.toLowerCase().trim();
  
  // Check if role already exists in team composition
  const existingMember = this.teamStructure.teamComposition.find(member => 
    member.normalizedRoleType === normalizedRole && member.status === 'active'
  );
  
  if (existingMember) {
    return {
      hasConflict: true,
      conflictType: 'exact',
      existingMember,
      message: `${requestedRole} position is already filled`
    };
  }
  
  // Check if role exists in roles needed but is filled
  const roleNeeded = this.teamStructure.rolesNeeded.find(role => 
    role.normalizedRoleType === normalizedRole
  );
  
  if (roleNeeded && roleNeeded.currentPositions >= roleNeeded.maxPositions) {
    return {
      hasConflict: true,
      conflictType: 'capacity',
      roleNeeded,
      message: `${requestedRole} position is at maximum capacity (${roleNeeded.maxPositions})`
    };
  }
  
  return { hasConflict: false };
};

ideaSchema.methods.addTeamMember = function(userId, roleData, assignedBy) {
  const newMember = {
    user: userId,
    assignedRole: roleData.assignedRole,
    roleType: roleData.roleType,
    normalizedRoleType: roleData.roleType.toLowerCase().trim(),
    isLead: roleData.isLead || false,
    assignedBy: assignedBy,
    assignedAt: new Date()
  };
  
  this.teamStructure.teamComposition.push(newMember);
  this.teamStructure.currentTeamSize = this.teamStructure.teamComposition.filter(m => m.status === 'active').length + 1; // +1 for author
  this.teamStructure.lastTeamUpdate = new Date();
  
  // Update role positions if role exists in rolesNeeded
  const roleNeeded = this.teamStructure.rolesNeeded.find(role => 
    role.normalizedRoleType === newMember.normalizedRoleType
  );
  if (roleNeeded) {
    roleNeeded.currentPositions += 1;
  }
  
  // Check if team is complete
  this.checkTeamCompletion();
  
  return newMember;
};

ideaSchema.methods.removeTeamMember = function(userId) {
  const memberIndex = this.teamStructure.teamComposition.findIndex(member => 
    member.user.toString() === userId.toString() && member.status === 'active'
  );
  
  if (memberIndex === -1) {
    throw new Error('Team member not found');
  }
  
  const member = this.teamStructure.teamComposition[memberIndex];
  member.status = 'removed';
  
  // Update role positions
  const roleNeeded = this.teamStructure.rolesNeeded.find(role => 
    role.normalizedRoleType === member.normalizedRoleType
  );
  if (roleNeeded && roleNeeded.currentPositions > 0) {
    roleNeeded.currentPositions -= 1;
  }
  
  this.teamStructure.currentTeamSize = this.teamStructure.teamComposition.filter(m => m.status === 'active').length + 1;
  this.teamStructure.lastTeamUpdate = new Date();
  this.teamStructure.isTeamComplete = false;
  
  return member;
};

ideaSchema.methods.addRoleNeeded = function(roleData) {
  const newRole = {
    roleType: roleData.roleType,
    normalizedRoleType: roleData.roleType.toLowerCase().trim(),
    isCore: roleData.isCore !== undefined ? roleData.isCore : true,
    maxPositions: roleData.maxPositions || 1,
    currentPositions: 0,
    priority: roleData.priority || 2,
    skillsRequired: roleData.skillsRequired || [],
    description: roleData.description || ''
  };
  
  this.teamStructure.rolesNeeded.push(newRole);
  this.teamStructure.maxTeamSize = this.teamStructure.rolesNeeded.length + 1;
  this.teamStructure.lastTeamUpdate = new Date();
  
  return newRole;
};

ideaSchema.methods.checkTeamCompletion = function() {
  const totalRequiredPositions = this.teamStructure.rolesNeeded.reduce((sum, role) => sum + role.maxPositions, 0);
  const totalFilledPositions = this.teamStructure.rolesNeeded.reduce((sum, role) => sum + role.currentPositions, 0);
  
  this.teamStructure.isTeamComplete = totalFilledPositions >= totalRequiredPositions;
  
  if (this.teamStructure.isTeamComplete && !this.teamStructure.teamFormationDate) {
    this.teamStructure.teamFormationDate = new Date();
  }
  
  return this.teamStructure.isTeamComplete;
};

ideaSchema.methods.getTeamMetrics = function() {
  const activeMembers = this.teamStructure.teamComposition.filter(m => m.status === 'active');
  const totalSlots = this.teamStructure.rolesNeeded.reduce((sum, role) => sum + role.maxPositions, 0);
  const filledSlots = this.teamStructure.rolesNeeded.reduce((sum, role) => sum + role.currentPositions, 0);
  
  return {
    maxTeamSize: totalSlots + 1, // +1 for author
    currentSize: activeMembers.length + 1, // +1 for author
    openPositions: totalSlots - filledSlots,
    completionPercentage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
    isComplete: this.teamStructure.isTeamComplete,
    coreRolesFilled: this.teamStructure.rolesNeeded.filter(role => role.isCore && role.currentPositions > 0).length,
    totalCoreRoles: this.teamStructure.rolesNeeded.filter(role => role.isCore).length
  };
};

const Idea = mongoose.model('Idea', ideaSchema);

export default Idea; 