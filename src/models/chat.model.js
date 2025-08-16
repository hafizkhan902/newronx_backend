import mongoose from 'mongoose';

// Sub-schema for chat members with roles and permissions
const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['creator', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  permissions: {
    canAddMembers: {
      type: Boolean,
      default: false
    },
    canRemoveMembers: {
      type: Boolean,
      default: false
    },
    canEditGroup: {
      type: Boolean,
      default: false
    },
    canDeleteMessages: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Main chat schema
const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() {
      return this.type === 'group';
    },
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 100
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // For idea-based groups
  relatedIdea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea'
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ 'members.user': 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ creator: 1 });
chatSchema.index({ lastActivity: -1 });

// Virtual to get active members count
chatSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Method to check if user is member
chatSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to get member by user ID
chatSchema.methods.getMember = function(userId) {
  return this.members.find(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to check permissions
chatSchema.methods.hasPermission = function(userId, action) {
  const member = this.getMember(userId);
  if (!member) return false;
  
  // Creator and admins have all permissions
  if (member.role === 'creator' || member.role === 'admin') {
    return true;
  }
  
  // Check specific permissions for members
  switch(action) {
    case 'add_member':
      return member.permissions.canAddMembers;
    case 'remove_member':
      return member.permissions.canRemoveMembers;
    case 'edit_group':
      return member.permissions.canEditGroup;
    case 'delete_message':
      return member.permissions.canDeleteMessages;
    case 'send_message':
      return true; // All members can send messages
    default:
      return false;
  }
};

// Pre-save middleware to set creator permissions
chatSchema.pre('save', function(next) {
  if (this.isNew) {
    // Ensure creator is in members with proper role
    const creatorMember = this.members.find(member => 
      member.user.toString() === this.creator.toString()
    );
    
    if (!creatorMember) {
      this.members.push({
        user: this.creator,
        role: 'creator',
        permissions: {
          canAddMembers: true,
          canRemoveMembers: true,
          canEditGroup: true,
          canDeleteMessages: true
        }
      });
    } else {
      creatorMember.role = 'creator';
      creatorMember.permissions = {
        canAddMembers: true,
        canRemoveMembers: true,
        canEditGroup: true,
        canDeleteMessages: true
      };
    }
  }
  next();
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat; 