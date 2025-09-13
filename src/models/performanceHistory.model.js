import mongoose from 'mongoose';

// Performance History for Trend Analysis Schema
const performanceHistorySchema = new mongoose.Schema({
  ideaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Historical Performance Snapshot
  date: { type: Date, required: true, index: true },
  overallScore: { type: Number, min: 0, max: 5, default: 0 },
  taskScore: { type: Number, min: 0, max: 5, default: 0 },
  communicationScore: { type: Number, min: 0, max: 5, default: 0 },
  collaborationScore: { type: Number, min: 0, max: 5, default: 0 },
  contributionScore: { type: Number, min: 0, max: 5, default: 0 },
  
  // Key Metrics Snapshot
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
    postsCreated: { type: Number, default: 0 },
    filesUploaded: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
performanceHistorySchema.index({ ideaId: 1, userId: 1, date: -1 });
performanceHistorySchema.index({ ideaId: 1, date: -1 });

// TTL index to automatically delete old records after 1 year
performanceHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 365 days

// Static method to get user performance trends
performanceHistorySchema.statics.getUserTrends = async function(userId, ideaId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    userId: new mongoose.Types.ObjectId(userId),
    ideaId: new mongoose.Types.ObjectId(ideaId),
    date: { $gte: startDate }
  }).sort({ date: 1 }).lean();
};

// Static method to get team performance trends
performanceHistorySchema.statics.getTeamTrends = async function(ideaId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
    {
      $match: {
        ideaId: new mongoose.Types.ObjectId(ideaId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$date' }
        },
        avgOverallScore: { $avg: '$overallScore' },
        avgTaskScore: { $avg: '$taskScore' },
        avgCommunicationScore: { $avg: '$communicationScore' },
        avgCollaborationScore: { $avg: '$collaborationScore' },
        avgContributionScore: { $avg: '$contributionScore' },
        totalTasksCompleted: { $sum: '$metrics.tasksCompleted' },
        totalPostsCreated: { $sum: '$metrics.postsCreated' },
        totalFilesUploaded: { $sum: '$metrics.filesUploaded' },
        memberCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    },
    {
      $project: {
        date: '$_id',
        avgOverallScore: { $round: ['$avgOverallScore', 2] },
        avgTaskScore: { $round: ['$avgTaskScore', 2] },
        avgCommunicationScore: { $round: ['$avgCommunicationScore', 2] },
        avgCollaborationScore: { $round: ['$avgCollaborationScore', 2] },
        avgContributionScore: { $round: ['$avgContributionScore', 2] },
        totalTasksCompleted: 1,
        totalPostsCreated: 1,
        totalFilesUploaded: 1,
        memberCount: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to calculate performance trend direction
performanceHistorySchema.statics.calculateTrend = async function(userId, ideaId, days = 7) {
  const records = await this.find({
    userId: new mongoose.Types.ObjectId(userId),
    ideaId: new mongoose.Types.ObjectId(ideaId)
  }).sort({ date: -1 }).limit(days).lean();
  
  if (records.length < 2) return 'stable';
  
  const recent = records.slice(0, Math.ceil(records.length / 2));
  const older = records.slice(Math.ceil(records.length / 2));
  
  const recentAvg = recent.reduce((sum, r) => sum + r.overallScore, 0) / recent.length;
  const olderAvg = older.reduce((sum, r) => sum + r.overallScore, 0) / older.length;
  
  const difference = recentAvg - olderAvg;
  
  if (difference > 0.1) return 'up';
  if (difference < -0.1) return 'down';
  return 'stable';
};

// Static method to get performance insights
performanceHistorySchema.statics.getPerformanceInsights = async function(userId, ideaId, days = 30) {
  const trends = await this.getUserTrends(userId, ideaId, days);
  
  if (trends.length < 7) {
    return {
      hasEnoughData: false,
      message: 'Not enough data for insights. Need at least 7 days of activity.'
    };
  }
  
  const insights = [];
  
  // Analyze task performance trend
  const taskScores = trends.map(t => t.taskScore);
  const taskTrend = this.analyzeTrend(taskScores);
  
  if (taskTrend.direction === 'improving') {
    insights.push({
      type: 'success',
      category: 'tasks',
      message: `Task performance improved by ${taskTrend.change.toFixed(1)}% over the last ${days} days`
    });
  } else if (taskTrend.direction === 'declining') {
    insights.push({
      type: 'warning',
      category: 'tasks',
      message: `Task performance declined by ${Math.abs(taskTrend.change).toFixed(1)}% over the last ${days} days`
    });
  }
  
  // Analyze communication trend
  const commScores = trends.map(t => t.communicationScore);
  const commTrend = this.analyzeTrend(commScores);
  
  if (commTrend.direction === 'improving') {
    insights.push({
      type: 'success',
      category: 'communication',
      message: `Communication score improved by ${commTrend.change.toFixed(1)}% over the last ${days} days`
    });
  } else if (commTrend.direction === 'declining') {
    insights.push({
      type: 'warning',
      category: 'communication',
      message: `Communication responsiveness declined by ${Math.abs(commTrend.change).toFixed(1)}% over the last ${days} days`
    });
  }
  
  return {
    hasEnoughData: true,
    insights,
    overallTrend: this.analyzeTrend(trends.map(t => t.overallScore))
  };
};

// Helper method to analyze trend direction
performanceHistorySchema.statics.analyzeTrend = function(values) {
  if (values.length < 2) return { direction: 'stable', change: 0 };
  
  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  let direction = 'stable';
  if (change > 5) direction = 'improving';
  else if (change < -5) direction = 'declining';
  
  return { direction, change };
};

const PerformanceHistory = mongoose.model('PerformanceHistory', performanceHistorySchema);

export default PerformanceHistory;
