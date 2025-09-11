import mongoose from 'mongoose';

// Team File Schema
const teamFileSchema = new mongoose.Schema({
  ideaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Idea', 
    required: true,
    index: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  filename: { 
    type: String, 
    required: true 
  },
  originalName: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    maxlength: 500 
  },
  uploadMethod: {
    type: String,
    enum: ['direct', 'link'],
    required: true
  },
  fileType: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    default: 0 
  },
  url: { 
    type: String, 
    required: true 
  },
  category: {
    type: String,
    enum: ['document', 'image', 'video', 'audio', 'archive', 'code', 'design', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  isPublic: {
    type: Boolean,
    default: true // All team members can see by default
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number, // for videos/audio
    pages: Number, // for documents
    format: String
  },
  version: {
    type: Number,
    default: 1
  },
  parentFileId: { // For file versions
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamFile'
  },
  isActive: {
    type: Boolean,
    default: true
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
teamFileSchema.index({ ideaId: 1, createdAt: -1 });
teamFileSchema.index({ uploadedBy: 1, createdAt: -1 });
teamFileSchema.index({ category: 1, createdAt: -1 });
teamFileSchema.index({ fileType: 1 });
teamFileSchema.index({ tags: 1 });
teamFileSchema.index({ isActive: 1, createdAt: -1 });

// Virtual for file size in human readable format
teamFileSchema.virtual('fileSizeFormatted').get(function() {
  if (this.fileSize === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file extension
teamFileSchema.virtual('fileExtension').get(function() {
  return this.originalName.split('.').pop().toLowerCase();
});

// Virtual for is image
teamFileSchema.virtual('isImage').get(function() {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return imageTypes.includes(this.fileExtension);
});

// Virtual for is document
teamFileSchema.virtual('isDocument').get(function() {
  const docTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  return docTypes.includes(this.fileExtension);
});

// Ensure virtuals are included in JSON output
teamFileSchema.set('toJSON', { virtuals: true });
teamFileSchema.set('toObject', { virtuals: true });

// Instance Methods
teamFileSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

teamFileSchema.methods.updateVersion = function(newVersion) {
  this.version = newVersion;
  this.updatedAt = new Date();
  return this.save();
};

// Static Methods
teamFileSchema.statics.getTeamFiles = async function(ideaId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    category = null,
    fileType = null,
    uploadedBy = null,
    sortBy = 'createdAt', 
    sortOrder = -1,
    search = null
  } = options;

  const skip = (page - 1) * limit;
  
  // Build match conditions
  const matchConditions = { 
    ideaId: new mongoose.Types.ObjectId(ideaId),
    isActive: true
  };

  if (category) matchConditions.category = category;
  if (fileType) matchConditions.fileType = new RegExp(fileType, 'i');
  if (uploadedBy) matchConditions.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
  
  if (search) {
    matchConditions.$or = [
      { originalName: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') }
    ];
  }

  const pipeline = [
    { $match: matchConditions },
    { $sort: { [sortBy]: sortOrder } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'uploadedBy',
        foreignField: '_id',
        as: 'uploader',
        pipeline: [
          { $project: { firstName: 1, fullName: 1, avatar: 1 } }
        ]
      }
    },
    {
      $addFields: {
        uploader: { $arrayElemAt: ['$uploader', 0] }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

teamFileSchema.statics.getFileStats = async function(ideaId) {
  const stats = await this.aggregate([
    { $match: { ideaId: new mongoose.Types.ObjectId(ideaId), isActive: true } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        totalDownloads: { $sum: '$downloadCount' },
        byCategory: {
          $push: {
            category: '$category',
            size: '$fileSize'
          }
        },
        byUploadMethod: {
          $push: {
            method: '$uploadMethod',
            count: 1
          }
        }
      }
    },
    {
      $addFields: {
        categorySummary: {
          $reduce: {
            input: '$byCategory',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [{
                      k: '$$this.category',
                      v: {
                        $add: [
                          { $ifNull: [{ $getField: { field: '$$this.category', input: '$$value' } }, 0] },
                          '$$this.size'
                        ]
                      }
                    }]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalFiles: 0,
    totalSize: 0,
    totalDownloads: 0,
    categorySummary: {},
    byUploadMethod: []
  };
};

// Pre-save middleware
teamFileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-categorize based on file type
  if (!this.category || this.category === 'other') {
    const ext = this.fileExtension;
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      this.category = 'image';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
      this.category = 'document';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
      this.category = 'video';
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
      this.category = 'audio';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      this.category = 'archive';
    } else if (['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) {
      this.category = 'code';
    } else if (['psd', 'ai', 'sketch', 'fig', 'xd'].includes(ext)) {
      this.category = 'design';
    }
  }
  
  next();
});

// Pre-remove middleware to clean up files
teamFileSchema.pre('remove', async function(next) {
  try {
    // Delete from Cloudinary if it's a direct upload
    if (this.uploadMethod === 'direct' && this.filename) {
      const { FileUploadService } = await import('../services/fileUploadService.js');
      await FileUploadService.deleteFromCloudinary(this.filename);
    }
    next();
  } catch (error) {
    next(error);
  }
});

const TeamFile = mongoose.model('TeamFile', teamFileSchema);

export default TeamFile;
