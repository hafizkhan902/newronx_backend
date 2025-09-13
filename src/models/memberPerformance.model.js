import mongoose from 'mongoose';

// Individual Member Performance Schema
const memberPerformanceSchema = new mongoose.Schema({
  teamPerformanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamPerformance',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Team membership ID
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Overall Performance
  overall: {
    score: { type: Number, min: 0, max: 5, required: true, default: 0 }, // 0-5.0
    grade: { 
      type: String, 
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'], 
      default: 'C'
    },
    trend: { 
      type: String, 
      enum: ['up', 'down', 'stable'], 
      default: 'stable' 
    }
  },
  
  // Task Performance (40% weight)
  tasks: {
    score: { type: Number, min: 0, max: 5, default: 0 },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },
    onTimeRate: { type: Number, min: 0, max: 100, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    inProgressTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    avgCompletionTime: { type: String, default: '0d' }, // formatted duration
    avgCompletionTimeMs: { type: Number, default: 0 },
    priorityPerformance: { type: Number, min: 0, max: 100, default: 0 }
  },
  
  // Communication Performance (25% weight)
  communication: {
    score: { type: Number, min: 0, max: 5, default: 0 },
    avgResponseTime: { type: String, default: '0h' }, // formatted duration
    avgResponseTimeMs: { type: Number, default: 0 },
    messagesPerDay: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    activityLevel: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    avgMessageLength: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 }
  },
  
  // Collaboration Performance (20% weight)
  collaboration: {
    score: { type: Number, min: 0, max: 5, default: 0 },
    totalPosts: { type: Number, default: 0 },
    avgLikesPerPost: { type: Number, default: 0 },
    avgCommentsPerPost: { type: Number, default: 0 },
    mentionCount: { type: Number, default: 0 },
    knowledgeSharing: { type: Number, default: 0 },
    engagementRate: { type: Number, min: 0, max: 10, default: 0 }
  },
  
  // Contribution Performance (15% weight)
  contribution: {
    score: { type: Number, min: 0, max: 5, default: 0 },
    totalFiles: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    avgDownloadsPerFile: { type: Number, default: 0 },
    documentFiles: { type: Number, default: 0 },
    codeFiles: { type: Number, default: 0 },
    designFiles: { type: Number, default: 0 },
    diversityScore: { type: Number, min: 0, max: 5, default: 0 },
    contributionTypes: [{ type: String }] // ['documentation', 'code', 'design', 'communication']
  },
  
  // Individual Insights
  insights: [{
    type: { 
      type: String, 
      enum: ['success', 'warning', 'info'], 
      required: true 
    },
    message: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['tasks', 'communication', 'collaboration', 'contribution', 'overall'] 
    }
  }],
  
  // Individual Recommendations
  recommendations: [{
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    action: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['tasks', 'communication', 'collaboration', 'contribution'] 
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
memberPerformanceSchema.index({ teamPerformanceId: 1, memberId: 1 });
memberPerformanceSchema.index({ userId: 1, createdAt: -1 });
memberPerformanceSchema.index({ teamPerformanceId: 1, 'overall.score': -1 });

// Virtual for performance summary
memberPerformanceSchema.virtual('performanceSummary').get(function() {
  return {
    grade: this.overall.grade,
    score: this.overall.score,
    strengths: this.getStrengths(),
    improvements: this.getImprovementAreas()
  };
});

// Instance method to get performance strengths
memberPerformanceSchema.methods.getStrengths = function() {
  const strengths = [];
  const scores = {
    tasks: this.tasks.score,
    communication: this.communication.score,
    collaboration: this.collaboration.score,
    contribution: this.contribution.score
  };
  
  // Find areas with score >= 4.0
  Object.entries(scores).forEach(([area, score]) => {
    if (score >= 4.0) {
      strengths.push(area);
    }
  });
  
  return strengths;
};

// Instance method to get improvement areas
memberPerformanceSchema.methods.getImprovementAreas = function() {
  const improvements = [];
  const scores = {
    tasks: this.tasks.score,
    communication: this.communication.score,
    collaboration: this.collaboration.score,
    contribution: this.contribution.score
  };
  
  // Find areas with score < 3.0
  Object.entries(scores).forEach(([area, score]) => {
    if (score < 3.0) {
      improvements.push(area);
    }
  });
  
  return improvements;
};

// Static method to get member performance history
memberPerformanceSchema.statics.getMemberHistory = async function(userId, ideaId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
    {
      $lookup: {
        from: 'teamperformances',
        localField: 'teamPerformanceId',
        foreignField: '_id',
        as: 'teamPerf'
      }
    },
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'teamPerf.ideaId': new mongoose.Types.ObjectId(ideaId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $sort: { createdAt: 1 }
    },
    {
      $project: {
        date: '$createdAt',
        overallScore: '$overall.score',
        taskScore: '$tasks.score',
        communicationScore: '$communication.score',
        collaborationScore: '$collaboration.score',
        contributionScore: '$contribution.score'
      }
    }
  ]);
};

// Static method to get team leaderboard
memberPerformanceSchema.statics.getTeamLeaderboard = async function(teamPerformanceId, limit = 10) {
  return await this.find({ teamPerformanceId })
    .populate('userId', 'firstName fullName avatar')
    .sort({ 'overall.score': -1 })
    .limit(limit)
    .lean();
};

// Pre-save middleware to calculate grade based on score
memberPerformanceSchema.pre('save', function(next) {
  // Calculate grade based on overall score
  const score = this.overall.score;
  
  if (score >= 4.5) this.overall.grade = 'A+';
  else if (score >= 4.0) this.overall.grade = 'A';
  else if (score >= 3.5) this.overall.grade = 'A-';
  else if (score >= 3.0) this.overall.grade = 'B+';
  else if (score >= 2.5) this.overall.grade = 'B';
  else if (score >= 2.0) this.overall.grade = 'B-';
  else if (score >= 1.5) this.overall.grade = 'C+';
  else if (score >= 1.0) this.overall.grade = 'C';
  else if (score >= 0.5) this.overall.grade = 'C-';
  else this.overall.grade = 'D';
  
  next();
});

// Ensure virtual fields are included in JSON output
memberPerformanceSchema.set('toJSON', { virtuals: true });
memberPerformanceSchema.set('toObject', { virtuals: true });

const MemberPerformance = mongoose.model('MemberPerformance', memberPerformanceSchema);

export default MemberPerformance;
