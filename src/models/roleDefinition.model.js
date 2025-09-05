import mongoose from 'mongoose';

// Role hierarchy and definition system
const roleDefinitionSchema = new mongoose.Schema({
  // Core role information
  roleName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  normalizedName: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  category: {
    type: String,
    enum: ['technical', 'business', 'creative', 'operations', 'marketing', 'other'],
    required: true,
    index: true
  },
  
  // Role hierarchy
  isCore: {
    type: Boolean,
    default: true
  },
  parentRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoleDefinition',
    default: null
  },
  commonSubroles: [{
    name: String,
    description: String,
    skillLevel: {
      type: String,
      enum: ['junior', 'mid', 'senior', 'lead', 'specialist']
    }
  }],
  
  // Role details
  description: {
    type: String,
    required: true
  },
  requiredSkills: [String],
  optionalSkills: [String],
  responsibilities: [String],
  
  // Industry and project relevance
  industryRelevance: [{
    type: String,
    enum: ['tech', 'ecommerce', 'saas', 'mobile', 'web', 'ai', 'fintech', 'healthcare', 'education', 'other']
  }],
  projectTypes: [String],
  
  // Similarity and matching
  similarRoles: [String],
  alternativeNames: [String],
  
  // Usage statistics
  usageCount: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // AI suggestions metadata
  aiGenerated: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes for performance
roleDefinitionSchema.index({ roleName: 'text', description: 'text' });
roleDefinitionSchema.index({ category: 1, isCore: 1 });
roleDefinitionSchema.index({ normalizedName: 1, category: 1 });
roleDefinitionSchema.index({ usageCount: -1 });

// Methods
roleDefinitionSchema.methods.generateSubroles = function() {
  return this.commonSubroles.map(subrole => ({
    ...subrole,
    fullName: `${subrole.skillLevel ? subrole.skillLevel + ' ' : ''}${this.roleName}`,
    parentRoleId: this._id
  }));
};

roleDefinitionSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return await this.save();
};

// Static methods
roleDefinitionSchema.statics.findSimilarRoles = async function(roleName, threshold = 0.7) {
  const normalizedRole = roleName.toLowerCase().trim();
  
  // Exact match first
  let exactMatch = await this.findOne({ normalizedName: normalizedRole });
  if (exactMatch) return [exactMatch];
  
  // Fuzzy matching using text search
  const textMatches = await this.find({
    $text: { $search: roleName }
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
  
  // Alternative names matching
  const alternativeMatches = await this.find({
    alternativeNames: { $in: [normalizedRole] }
  });
  
  return [...textMatches, ...alternativeMatches];
};

roleDefinitionSchema.statics.suggestSubroles = async function(baseRole, context = {}) {
  const role = await this.findOne({ 
    $or: [
      { normalizedName: baseRole.toLowerCase() },
      { alternativeNames: baseRole.toLowerCase() }
    ]
  });
  
  if (!role) return [];
  
  let suggestions = role.generateSubroles();
  
  // Add context-based suggestions
  if (context.projectType) {
    const contextRoles = await this.find({
      projectTypes: context.projectType,
      parentRole: role._id
    });
    suggestions = [...suggestions, ...contextRoles];
  }
  
  return suggestions.slice(0, 5); // Limit to top 5 suggestions
};

const RoleDefinition = mongoose.model('RoleDefinition', roleDefinitionSchema);

export default RoleDefinition;
