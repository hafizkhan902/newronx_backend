import mongoose from 'mongoose';

// Performance Alerts and Notifications Schema
const performanceAlertSchema = new mongoose.Schema({
  ideaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Alert Details
  alertType: {
    type: String,
    enum: ['performance_drop', 'deadline_risk', 'low_engagement', 'team_milestone', 'inactive_member', 'quality_issue'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Related Data
  affectedMembers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    memberId: { type: mongoose.Schema.Types.ObjectId },
    currentScore: { type: Number, min: 0, max: 5 },
    previousScore: { type: Number, min: 0, max: 5 },
    role: { type: String }
  }],
  
  // Alert Metadata
  category: {
    type: String,
    enum: ['tasks', 'communication', 'collaboration', 'overall', 'team'],
    required: true
  },
  
  // Threshold that triggered the alert
  threshold: {
    metric: { type: String }, // e.g., 'overall_score', 'task_completion_rate'
    value: { type: Number },
    operator: { type: String, enum: ['<', '>', '<=', '>=', '=='] }
  },
  
  // Alert Status
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String },
  
  // Auto-resolution settings
  autoResolve: { type: Boolean, default: false },
  autoResolveCondition: { type: String }
}, {
  timestamps: true
});

// Indexes for efficient queries
performanceAlertSchema.index({ ideaId: 1, authorId: 1, isRead: 1 });
performanceAlertSchema.index({ createdAt: -1 });
performanceAlertSchema.index({ severity: 1, isResolved: 1 });
performanceAlertSchema.index({ alertType: 1, isResolved: 1 });

// TTL index to automatically delete resolved alerts after 30 days
performanceAlertSchema.index(
  { resolvedAt: 1 }, 
  { 
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { isResolved: true }
  }
);

// Virtual for alert age
performanceAlertSchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for alert urgency score
performanceAlertSchema.virtual('urgencyScore').get(function() {
  let score = 0;
  
  // Base score from severity
  switch (this.severity) {
    case 'critical': score += 100; break;
    case 'high': score += 75; break;
    case 'medium': score += 50; break;
    case 'low': score += 25; break;
  }
  
  // Add urgency based on age
  const ageHours = this.ageInHours;
  if (ageHours > 48) score += 20; // Old alerts are more urgent
  if (ageHours > 72) score += 30;
  
  // Add urgency based on affected members count
  score += Math.min(this.affectedMembers.length * 5, 25);
  
  return Math.min(score, 200); // Cap at 200
});

// Static method to create performance drop alert
performanceAlertSchema.statics.createPerformanceDropAlert = async function(ideaId, authorId, affectedMembers) {
  const memberNames = affectedMembers.map(m => m.user?.fullName || 'Unknown').join(', ');
  const avgCurrentScore = affectedMembers.reduce((sum, m) => sum + (m.currentScore || 0), 0) / affectedMembers.length;
  
  return await this.create({
    ideaId,
    authorId,
    alertType: 'performance_drop',
    severity: avgCurrentScore < 2.0 ? 'critical' : avgCurrentScore < 3.0 ? 'high' : 'medium',
    title: 'Team Member Performance Drop Detected',
    message: `${affectedMembers.length} team member(s) (${memberNames}) showing significant performance decline. Current average score: ${avgCurrentScore.toFixed(1)}/5.0`,
    category: 'overall',
    affectedMembers: affectedMembers.map(m => ({
      userId: m.userId,
      memberId: m.memberId,
      currentScore: m.currentScore,
      previousScore: m.previousScore,
      role: m.role
    })),
    threshold: {
      metric: 'overall_score',
      value: 3.0,
      operator: '<'
    }
  });
};

// Static method to create deadline risk alert
performanceAlertSchema.statics.createDeadlineRiskAlert = async function(ideaId, authorId, riskData) {
  return await this.create({
    ideaId,
    authorId,
    alertType: 'deadline_risk',
    severity: riskData.daysUntilDeadline < 2 ? 'critical' : riskData.daysUntilDeadline < 5 ? 'high' : 'medium',
    title: 'Project Deadline Risk Alert',
    message: `${riskData.overdueTasks} overdue tasks and ${riskData.atRiskTasks} at-risk tasks. Project completion at risk in ${riskData.daysUntilDeadline} days.`,
    category: 'tasks',
    affectedMembers: riskData.affectedMembers || [],
    threshold: {
      metric: 'completion_rate',
      value: 80,
      operator: '<'
    }
  });
};

// Static method to create low engagement alert
performanceAlertSchema.statics.createLowEngagementAlert = async function(ideaId, authorId, engagementData) {
  return await this.create({
    ideaId,
    authorId,
    alertType: 'low_engagement',
    severity: engagementData.avgEngagement < 2.0 ? 'high' : 'medium',
    title: 'Low Team Engagement Detected',
    message: `Team engagement score is ${engagementData.avgEngagement.toFixed(1)}/10. ${engagementData.inactiveMembers} members have been inactive for over ${engagementData.inactiveDays} days.`,
    category: 'collaboration',
    affectedMembers: engagementData.affectedMembers || [],
    threshold: {
      metric: 'engagement_score',
      value: 3.0,
      operator: '<'
    }
  });
};

// Static method to create team milestone alert
performanceAlertSchema.statics.createTeamMilestoneAlert = async function(ideaId, authorId, milestoneData) {
  return await this.create({
    ideaId,
    authorId,
    alertType: 'team_milestone',
    severity: 'low',
    title: 'Team Milestone Achieved',
    message: milestoneData.message,
    category: 'team',
    affectedMembers: [],
    threshold: {
      metric: milestoneData.metric,
      value: milestoneData.threshold,
      operator: '>='
    }
  });
};

// Instance method to mark as read
performanceAlertSchema.methods.markAsRead = async function() {
  this.isRead = true;
  return await this.save();
};

// Instance method to resolve alert
performanceAlertSchema.methods.resolve = async function(resolvedBy, notes = '') {
  this.isResolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  return await this.save();
};

// Static method to get unread alerts for author
performanceAlertSchema.statics.getUnreadAlerts = async function(authorId, ideaId = null) {
  const query = { 
    authorId: new mongoose.Types.ObjectId(authorId), 
    isRead: false, 
    isResolved: false 
  };
  
  if (ideaId) {
    query.ideaId = new mongoose.Types.ObjectId(ideaId);
  }
  
  return await this.find(query)
    .populate('affectedMembers.userId', 'firstName fullName avatar')
    .sort({ urgencyScore: -1, createdAt: -1 })
    .lean();
};

// Static method to get alert statistics
performanceAlertSchema.statics.getAlertStats = async function(authorId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
    {
      $match: {
        authorId: new mongoose.Types.ObjectId(authorId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        criticalAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        resolvedAlerts: { $sum: { $cond: ['$isResolved', 1, 0] } },
        unreadAlerts: { $sum: { $cond: [{ $and: [{ $not: '$isRead' }, { $not: '$isResolved' }] }, 1, 0] } },
        avgResolutionTimeHours: {
          $avg: {
            $cond: [
              '$isResolved',
              { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware to set auto-resolve conditions
performanceAlertSchema.pre('save', function(next) {
  // Set auto-resolve conditions based on alert type
  if (this.isNew) {
    switch (this.alertType) {
      case 'performance_drop':
        this.autoResolve = true;
        this.autoResolveCondition = 'performance_improved';
        break;
      case 'deadline_risk':
        this.autoResolve = true;
        this.autoResolveCondition = 'tasks_completed';
        break;
      case 'low_engagement':
        this.autoResolve = true;
        this.autoResolveCondition = 'engagement_improved';
        break;
    }
  }
  
  next();
});

// Ensure virtual fields are included in JSON output
performanceAlertSchema.set('toJSON', { virtuals: true });
performanceAlertSchema.set('toObject', { virtuals: true });

const PerformanceAlert = mongoose.model('PerformanceAlert', performanceAlertSchema);

export default PerformanceAlert;
