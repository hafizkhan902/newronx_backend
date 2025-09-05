import mongoose from 'mongoose';

// Sub-schema for task assignments
const taskAssignmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    enum: ['assigned', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'assigned'
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  hoursLogged: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: true });

// Sub-schema for task comments
const taskCommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

// Sub-schema for task attachments
const taskAttachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Main task schema
const taskSchema = new mongoose.Schema({
  // Basic task information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Task categorization
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    required: true
  },
  category: {
    type: String,
    enum: [
      'development', 'design', 'marketing', 'research', 
      'planning', 'testing', 'documentation', 'meeting', 
      'review', 'deployment', 'maintenance', 'other'
    ],
    required: true
  },
  
  // Time and deadline management
  estimatedHours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 1000
  },
  actualHours: {
    type: Number,
    default: 0,
    min: 0
  },
  deadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  
  // Assignment and ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  idea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    required: true
  },
  assignmentType: {
    type: String,
    enum: ['specific', 'everyone', 'unassigned'],
    default: 'specific'
  },
  assignments: [taskAssignmentSchema],
  
  // Task status and progress
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold'],
    default: 'todo'
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Tags and labels
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  
  // Task relationships
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'depends_on', 'related'],
      default: 'depends_on'
    }
  }],
  
  // Collaboration features
  comments: [taskCommentSchema],
  attachments: [taskAttachmentSchema],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Task metrics
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Recurring task support
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: Number,
    endDate: Date,
    enabled: {
      type: Boolean,
      default: false
    }
  },
  
  // Archive and deletion
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ idea: 1, status: 1 });
taskSchema.index({ 'assignments.user': 1, status: 1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ deadline: 1, status: 1 });
taskSchema.index({ priority: 1, deadline: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ category: 1, status: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && !['completed', 'cancelled'].includes(this.status);
});

// Virtual for days until deadline
taskSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for assigned users count
taskSchema.virtual('assignedUsersCount').get(function() {
  return this.assignments.filter(assignment => 
    assignment.status !== 'cancelled'
  ).length;
});

// Instance methods
taskSchema.methods.assignToUser = function(userId, assignedBy) {
  // Check if user is already assigned
  const existingAssignment = this.assignments.find(assignment => 
    assignment.user.toString() === userId.toString() && 
    assignment.status !== 'cancelled'
  );
  
  if (existingAssignment) {
    throw new Error('User is already assigned to this task');
  }
  
  this.assignments.push({
    user: userId,
    assignedBy: assignedBy,
    status: 'assigned'
  });
  
  // Add user to watchers if not already watching
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this;
};

taskSchema.methods.unassignUser = function(userId) {
  const assignment = this.assignments.find(assignment => 
    assignment.user.toString() === userId.toString() && 
    assignment.status !== 'cancelled'
  );
  
  if (assignment) {
    assignment.status = 'cancelled';
  }
  
  return this;
};

taskSchema.methods.updateProgress = function(percentage, userId) {
  this.completionPercentage = Math.max(0, Math.min(100, percentage));
  
  // Auto-update status based on completion
  if (percentage === 0) {
    this.status = 'todo';
  } else if (percentage > 0 && percentage < 100) {
    this.status = 'in_progress';
  } else if (percentage === 100) {
    this.status = 'completed';
    
    // Mark assignments as completed
    this.assignments.forEach(assignment => {
      if (assignment.status === 'in_progress' || assignment.status === 'assigned') {
        assignment.status = 'completed';
        assignment.completedAt = new Date();
      }
    });
  }
  
  return this;
};

taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content.trim()
  });
  
  // Add user to watchers if not already watching
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this;
};

taskSchema.methods.addView = function(userId) {
  this.viewCount += 1;
  
  // Update or add last viewed entry
  const existingView = this.lastViewedBy.find(view => 
    view.user.toString() === userId.toString()
  );
  
  if (existingView) {
    existingView.viewedAt = new Date();
  } else {
    this.lastViewedBy.push({
      user: userId,
      viewedAt: new Date()
    });
  }
  
  return this;
};

// Static methods
taskSchema.statics.getTaskStats = async function(ideaId, userId = null) {
  const matchStage = { idea: ideaId };
  if (userId) {
    matchStage['assignments.user'] = userId;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        },
        inProgressTasks: { 
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } 
        },
        overdueTasks: {
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $lt: ['$deadline', new Date()] },
                  { $not: { $in: ['$status', ['completed', 'cancelled']] } }
                ]
              }, 
              1, 
              0
            ] 
          }
        },
        avgCompletionPercentage: { $avg: '$completionPercentage' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);
  
  return stats[0] || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    avgCompletionPercentage: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0
  };
};

taskSchema.statics.getTasksByCategory = async function(ideaId) {
  return await this.aggregate([
    { $match: { idea: ideaId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        completed: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        },
        avgProgress: { $avg: '$completionPercentage' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save middleware
taskSchema.pre('save', function(next) {
  // Auto-assign to everyone if assignmentType is 'everyone'
  if (this.assignmentType === 'everyone' && this.isNew) {
    // This will be handled in the service layer where we have access to team members
  }
  
  // Update actual hours from assignments
  if (this.assignments && this.assignments.length > 0) {
    this.actualHours = this.assignments.reduce((total, assignment) => 
      total + (assignment.hoursLogged || 0), 0
    );
  }
  
  next();
});

// Ensure virtual fields are included in JSON output
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;
