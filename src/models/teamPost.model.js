import mongoose from 'mongoose';

// Team Post Attachment Schema
const teamPostAttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// Team Post Mention Schema
const teamPostMentionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentionedAt: { type: Date, default: Date.now }
}, { _id: false });

// Team Post Like Schema
const teamPostLikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likedAt: { type: Date, default: Date.now }
}, { _id: false });

// Team Post Comment Schema
const teamPostCommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  mentions: [teamPostMentionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

// Main Team Post Schema
const teamPostSchema = new mongoose.Schema({
  ideaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Idea', 
    required: true,
    index: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true, 
    maxlength: 5000 
  },
  attachments: [teamPostAttachmentSchema],
  mentions: [teamPostMentionSchema],
  likes: [teamPostLikeSchema],
  comments: [teamPostCommentSchema],
  isAnnouncement: { 
    type: Boolean, 
    default: false 
  },
  isPinned: { 
    type: Boolean, 
    default: false 
  },
  visibility: {
    type: String,
    enum: ['team', 'author_only'],
    default: 'team'
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for better performance
teamPostSchema.index({ ideaId: 1, createdAt: -1 });
teamPostSchema.index({ author: 1, createdAt: -1 });
teamPostSchema.index({ 'mentions.user': 1 });
teamPostSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for like count
teamPostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
teamPostSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for attachment count
teamPostSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual for mention count
teamPostSchema.virtual('mentionCount').get(function() {
  return this.mentions ? this.mentions.length : 0;
});

// Ensure virtuals are included in JSON output
teamPostSchema.set('toJSON', { virtuals: true });
teamPostSchema.set('toObject', { virtuals: true });

// Instance Methods
teamPostSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
    return true;
  }
  return false;
};

teamPostSchema.methods.removeLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return true;
  }
  return false;
};

teamPostSchema.methods.addComment = function(commentData) {
  const comment = {
    author: commentData.author,
    content: commentData.content,
    mentions: commentData.mentions || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  this.comments.push(comment);
  return this.comments[this.comments.length - 1];
};

teamPostSchema.methods.updateComment = function(commentId, content, mentions) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.content = content;
    comment.mentions = mentions || [];
    comment.updatedAt = new Date();
    return comment;
  }
  return null;
};

teamPostSchema.methods.removeComment = function(commentId) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.remove();
    return true;
  }
  return false;
};

teamPostSchema.methods.isUserLiked = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Static Methods
teamPostSchema.statics.getTeamPosts = async function(ideaId, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    sortOrder = -1,
    includeComments = true,
    userId = null
  } = options;

  const skip = (page - 1) * limit;
  
  const pipeline = [
    { $match: { ideaId: new mongoose.Types.ObjectId(ideaId) } },
    { $sort: { isPinned: -1, [sortBy]: sortOrder } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorDetails',
        pipeline: [
          { $project: { firstName: 1, fullName: 1, avatar: 1, role: 1 } }
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'mentions.user',
        foreignField: '_id',
        as: 'mentionedUsers',
        pipeline: [
          { $project: { firstName: 1, fullName: 1, avatar: 1 } }
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'likes.user',
        foreignField: '_id',
        as: 'likedUsers',
        pipeline: [
          { $project: { firstName: 1, fullName: 1, avatar: 1 } }
        ]
      }
    }
  ];

  if (includeComments) {
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'comments.author',
        foreignField: '_id',
        as: 'commentAuthors',
        pipeline: [
          { $project: { firstName: 1, fullName: 1, avatar: 1 } }
        ]
      }
    });
  }

  pipeline.push({
    $addFields: {
      author: { $arrayElemAt: ['$authorDetails', 0] },
      likeCount: { $size: '$likes' },
      commentCount: { $size: '$comments' },
      attachmentCount: { $size: '$attachments' },
      mentionCount: { $size: '$mentions' },
      isLikedByUser: userId ? {
        $in: [new mongoose.Types.ObjectId(userId), '$likes.user']
      } : false
    }
  });

  pipeline.push({
    $project: {
      authorDetails: 0,
      'attachments.uploadedBy': 0
    }
  });

  return await this.aggregate(pipeline);
};

teamPostSchema.statics.getPostStats = async function(ideaId) {
  const stats = await this.aggregate([
    { $match: { ideaId: new mongoose.Types.ObjectId(ideaId) } },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalLikes: { $sum: { $size: '$likes' } },
        totalComments: { $sum: { $size: '$comments' } },
        totalAttachments: { $sum: { $size: '$attachments' } },
        pinnedPosts: {
          $sum: { $cond: ['$isPinned', 1, 0] }
        },
        announcements: {
          $sum: { $cond: ['$isAnnouncement', 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalAttachments: 0,
    pinnedPosts: 0,
    announcements: 0
  };
};

// Pre-save middleware
teamPostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-remove middleware to clean up attachments
teamPostSchema.pre('remove', async function(next) {
  try {
    // Here you could add logic to delete attachments from Cloudinary
    // const { FileUploadService } = await import('../services/fileUploadService.js');
    // for (const attachment of this.attachments) {
    //   await FileUploadService.deleteFromCloudinary(attachment.filename);
    // }
    next();
  } catch (error) {
    next(error);
  }
});

const TeamPost = mongoose.model('TeamPost', teamPostSchema);

export default TeamPost;
