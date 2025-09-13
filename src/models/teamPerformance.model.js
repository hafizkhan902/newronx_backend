import mongoose from 'mongoose';

// Team Performance Aggregations Schema
const teamPerformanceSchema = new mongoose.Schema({
  ideaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    required: true,
    index: true
  },
  calculationDate: {
    type: Date,
    required: true,
    index: true
  },
  timeRange: {
    type: String,
    enum: ['7d', '30d', '90d', 'all'],
    default: '30d'
  },
  
  // Overall Metrics
  overall: {
    productivity: { type: Number, min: 0, max: 100, default: 0 }, // 0-100%
    quality: { type: Number, min: 0, max: 5, default: 0 }, // 0-5.0
    velocity: { type: Number, min: 0, default: 0 }, // tasks per week
    collaboration: { type: Number, min: 0, max: 5, default: 0 }, // 0-5.0
    avgResponseTimeMs: { type: Number, default: 0 }
  },
  
  // Task Metrics
  tasks: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },
    completionRate: { type: Number, min: 0, max: 100, default: 0 }
  },
  
  // Communication Metrics
  communication: {
    totalMessages: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    avgResponseTime: { type: String, default: '0h' }, // formatted duration
    avgEngagementRate: { type: Number, min: 0, max: 10, default: 0 }
  },
  
  // Collaboration Metrics
  engagement: {
    totalPosts: { type: Number, default: 0 },
    totalFiles: { type: Number, default: 0 },
    avgEngagement: { type: Number, min: 0, max: 10, default: 0 },
    knowledgeSharingScore: { type: Number, min: 0, max: 5, default: 0 }
  },
  
  // Team Insights
  insights: [{
    type: { type: String, enum: ['success', 'warning', 'info'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ['tasks', 'communication', 'collaboration', 'overall'] }
  }],
  
  // Team Recommendations
  recommendations: [{
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    action: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['tasks', 'communication', 'collaboration', 'team'] }
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
teamPerformanceSchema.index({ ideaId: 1, calculationDate: -1 });
teamPerformanceSchema.index({ ideaId: 1, timeRange: 1, calculationDate: -1 });

// Virtual for formatted response time
teamPerformanceSchema.virtual('formattedResponseTime').get(function() {
  if (!this.overall.avgResponseTimeMs) return '0h';
  
  const hours = Math.floor(this.overall.avgResponseTimeMs / (1000 * 60 * 60));
  const minutes = Math.floor((this.overall.avgResponseTimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
});

// Static method to get latest performance data
teamPerformanceSchema.statics.getLatestPerformance = async function(ideaId, timeRange = '30d') {
  return await this.findOne({
    ideaId: new mongoose.Types.ObjectId(ideaId),
    timeRange
  }).sort({ calculationDate: -1 }).lean();
};

// Static method to get performance trends
teamPerformanceSchema.statics.getPerformanceTrends = async function(ideaId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    ideaId: new mongoose.Types.ObjectId(ideaId),
    calculationDate: { $gte: startDate }
  }).sort({ calculationDate: 1 }).lean();
};

// Instance method to calculate team grade
teamPerformanceSchema.methods.getTeamGrade = function() {
  const score = this.overall.productivity / 20; // Convert 0-100 to 0-5 scale
  
  if (score >= 4.5) return 'A+';
  if (score >= 4.0) return 'A';
  if (score >= 3.5) return 'A-';
  if (score >= 3.0) return 'B+';
  if (score >= 2.5) return 'B';
  if (score >= 2.0) return 'B-';
  if (score >= 1.5) return 'C+';
  if (score >= 1.0) return 'C';
  if (score >= 0.5) return 'C-';
  return 'D';
};

// Ensure virtual fields are included in JSON output
teamPerformanceSchema.set('toJSON', { virtuals: true });
teamPerformanceSchema.set('toObject', { virtuals: true });

const TeamPerformance = mongoose.model('TeamPerformance', teamPerformanceSchema);

export default TeamPerformance;
