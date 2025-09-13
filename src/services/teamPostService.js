import TeamPost from '../models/teamPost.model.js';
import Idea from '../models/idea.model.js';
import User from '../models/user.model.js';
import { ResponseService } from './responseService.js';

class TeamPostService {
  
  /**
   * Create a new team post
   */
  async createPost(userId, postData) {
    const { 
      ideaId, 
      content, 
      attachmentFiles, 
      attachmentLinks, 
      mentions, 
      isAnnouncement = false,
      isPinned = false 
    } = postData;

    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Only team members can create posts');
    }

    // Process attachments
    let processedAttachments = [];
    
    // Handle file attachments
    if (attachmentFiles && attachmentFiles.length > 0) {
      const { FileUploadService } = await import('./fileUploadService.js');
      for (const file of attachmentFiles) {
        const uploadResult = await FileUploadService.uploadToCloudinary(file, 'team-posts');
        processedAttachments.push({
          filename: uploadResult.publicId,
          originalName: file.originalname,
          url: uploadResult.url,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: new Date()
        });
      }
    }

    // Handle link attachments
    if (attachmentLinks && attachmentLinks.length > 0) {
      for (const link of attachmentLinks) {
        processedAttachments.push({
          filename: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalName: link.title || link.url,
          url: link.url,
          fileType: 'link',
          fileSize: 0,
          uploadedBy: userId,
          uploadedAt: new Date()
        });
      }
    }

    // Process mentions
    let processedMentions = [];
    if (mentions && mentions.length > 0) {
      // Validate mentioned users are team members
      const teamMemberIds = [
        idea.author.toString(),
        ...idea.team.map(member => member.user.toString())
      ];

      for (const mentionedUserId of mentions) {
        if (teamMemberIds.includes(mentionedUserId.toString())) {
          processedMentions.push({
            user: mentionedUserId,
            mentionedAt: new Date()
          });
        }
      }
    }

    // Only idea author can create announcements or pin posts
    const canCreateAnnouncement = idea.author.toString() === userId.toString();
    const finalIsAnnouncement = canCreateAnnouncement ? isAnnouncement : false;
    const finalIsPinned = canCreateAnnouncement ? isPinned : false;

    // Create the post
    const teamPost = new TeamPost({
      ideaId,
      author: userId,
      content,
      attachments: processedAttachments,
      mentions: processedMentions,
      isAnnouncement: finalIsAnnouncement,
      isPinned: finalIsPinned
    });

    await teamPost.save();

    // Send notifications for mentions
    if (processedMentions.length > 0) {
      await this.notifyMentionedUsers(teamPost, processedMentions);
    }

    // Return populated post
    return await this.getPostById(teamPost._id, userId);
  }

  /**
   * Get team posts for an idea
   */
  async getTeamPosts(ideaId, userId, options = {}) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Only team members can view team posts');
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1,
      includeComments = true
    } = options;

    const posts = await TeamPost.getTeamPosts(ideaId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder),
      includeComments,
      userId
    });

    // Get total count for pagination
    const totalPosts = await TeamPost.countDocuments({ ideaId });
    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single post by ID
   */
  async getPostById(postId, userId) {
    const post = await TeamPost.findById(postId)
      .populate('author', 'firstName fullName avatar role')
      .populate('mentions.user', 'firstName fullName avatar')
      .populate('likes.user', 'firstName fullName avatar')
      .populate('comments.author', 'firstName fullName avatar')
      .populate('attachments.uploadedBy', 'firstName fullName avatar');

    if (!post) {
      throw new Error('Post not found');
    }

    // Verify user is a team member
    const idea = await Idea.findById(post.ideaId);
    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    // Add user-specific data
    post.isLikedByUser = post.isUserLiked(userId);

    return post;
  }

  /**
   * Update a post
   */
  async updatePost(postId, userId, updateData) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Only author can update post
    if (post.author.toString() !== userId.toString()) {
      throw new Error('Only post author can update the post');
    }

    const { content, mentions } = updateData;

    if (content !== undefined) {
      post.content = content;
    }

    if (mentions !== undefined) {
      // Validate mentioned users are team members
      const idea = await Idea.findById(post.ideaId);
      const teamMemberIds = [
        idea.author.toString(),
        ...idea.team.map(member => member.user.toString())
      ];

      const processedMentions = [];
      for (const mentionedUserId of mentions) {
        if (teamMemberIds.includes(mentionedUserId.toString())) {
          processedMentions.push({
            user: mentionedUserId,
            mentionedAt: new Date()
          });
        }
      }
      post.mentions = processedMentions;
    }

    await post.save();
    return await this.getPostById(postId, userId);
  }

  /**
   * Delete a post
   */
  async deletePost(postId, userId) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if user can delete (author or idea owner)
    const idea = await Idea.findById(post.ideaId);
    const canDelete = post.author.toString() === userId.toString() || 
                     idea.author.toString() === userId.toString();

    if (!canDelete) {
      throw new Error('Only post author or idea owner can delete the post');
    }

    // Clean up attachments from Cloudinary
    for (const attachment of post.attachments) {
      if (attachment.fileType !== 'link') {
        try {
          const { FileUploadService } = await import('./fileUploadService.js');
          await FileUploadService.deleteFromCloudinary(attachment.filename);
        } catch (error) {
          console.error('Error deleting attachment:', error);
        }
      }
    }

    await TeamPost.findByIdAndDelete(postId);
    return { message: 'Post deleted successfully' };
  }

  /**
   * Toggle like on a post
   */
  async toggleLike(postId, userId) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify user is a team member
    const idea = await Idea.findById(post.ideaId);
    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    const isLiked = post.isUserLiked(userId);
    let action;

    if (isLiked) {
      post.removeLike(userId);
      action = 'unliked';
    } else {
      post.addLike(userId);
      action = 'liked';
    }

    await post.save();

    return {
      action,
      likeCount: post.likeCount,
      isLikedByUser: !isLiked
    };
  }

  /**
   * Add comment to a post
   */
  async addComment(postId, userId, commentData) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify user is a team member
    const idea = await Idea.findById(post.ideaId);
    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    const { content, mentions = [] } = commentData;

    // Process mentions for comment
    let processedMentions = [];
    if (mentions.length > 0) {
      const teamMemberIds = [
        idea.author.toString(),
        ...idea.team.map(member => member.user.toString())
      ];

      for (const mentionedUserId of mentions) {
        if (teamMemberIds.includes(mentionedUserId.toString())) {
          processedMentions.push({
            user: mentionedUserId,
            mentionedAt: new Date()
          });
        }
      }
    }

    const comment = post.addComment({
      author: userId,
      content,
      mentions: processedMentions
    });

    await post.save();

    // Send notifications for mentions in comment
    if (processedMentions.length > 0) {
      await this.notifyMentionedUsers(post, processedMentions, comment._id);
    }

    // Return populated comment
    await post.populate('comments.author', 'firstName fullName avatar');
    return post.comments.id(comment._id);
  }

  /**
   * Update a comment
   */
  async updateComment(postId, commentId, userId, updateData) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Only comment author can update
    if (comment.author.toString() !== userId.toString()) {
      throw new Error('Only comment author can update the comment');
    }

    const { content, mentions = [] } = updateData;

    // Process mentions
    let processedMentions = [];
    if (mentions.length > 0) {
      const idea = await Idea.findById(post.ideaId);
      const teamMemberIds = [
        idea.author.toString(),
        ...idea.team.map(member => member.user.toString())
      ];

      for (const mentionedUserId of mentions) {
        if (teamMemberIds.includes(mentionedUserId.toString())) {
          processedMentions.push({
            user: mentionedUserId,
            mentionedAt: new Date()
          });
        }
      }
    }

    post.updateComment(commentId, content, processedMentions);
    await post.save();

    await post.populate('comments.author', 'firstName fullName avatar');
    return post.comments.id(commentId);
  }

  /**
   * Delete a comment
   */
  async deleteComment(postId, commentId, userId) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user can delete (comment author, post author, or idea owner)
    const idea = await Idea.findById(post.ideaId);
    const canDelete = comment.author.toString() === userId.toString() || 
                     post.author.toString() === userId.toString() ||
                     idea.author.toString() === userId.toString();

    if (!canDelete) {
      throw new Error('Access denied');
    }

    post.removeComment(commentId);
    await post.save();

    return { message: 'Comment deleted successfully' };
  }

  /**
   * Pin/Unpin a post (only idea author)
   */
  async togglePin(postId, userId) {
    const post = await TeamPost.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Only idea author can pin posts
    const idea = await Idea.findById(post.ideaId);
    if (idea.author.toString() !== userId.toString()) {
      throw new Error('Only idea author can pin/unpin posts');
    }

    post.isPinned = !post.isPinned;
    await post.save();

    return {
      action: post.isPinned ? 'pinned' : 'unpinned',
      isPinned: post.isPinned
    };
  }

  /**
   * Get team post statistics
   */
  async getTeamPostStats(ideaId, userId) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    return await TeamPost.getPostStats(ideaId);
  }

  /**
   * Get user's posts in a team
   */
  async getUserPosts(ideaId, targetUserId, requestingUserId, options = {}) {
    // Verify requesting user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === requestingUserId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === requestingUserId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const posts = await TeamPost.find({ 
      ideaId, 
      author: targetUserId 
    })
    .populate('author', 'firstName fullName avatar role')
    .populate('mentions.user', 'firstName fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalPosts = await TeamPost.countDocuments({ ideaId, author: targetUserId });

    return {
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts
      }
    };
  }

  /**
   * Send notifications for mentioned users
   */
  async notifyMentionedUsers(post, mentions, commentId = null) {
    try {
      const { NotificationService } = await import('./notificationService.js');
      
      for (const mention of mentions) {
        const notificationData = {
          recipient: mention.user,
          type: commentId ? 'team_post_comment_mention' : 'team_post_mention',
          title: commentId ? 'You were mentioned in a comment' : 'You were mentioned in a team post',
          message: commentId 
            ? `You were mentioned in a comment on a team post`
            : `You were mentioned in a team post: "${post.content.substring(0, 100)}..."`,
          relatedEntities: {
            ideaId: post.ideaId,
            postId: post._id,
            commentId: commentId || null,
            mentionedBy: post.author
          },
          priority: 'medium'
        };

        await NotificationService.createNotification(notificationData);
      }
    } catch (error) {
      console.error('Error sending mention notifications:', error);
    }
  }

  /**
   * Search posts in team
   */
  async searchTeamPosts(ideaId, userId, searchQuery, options = {}) {
    // Verify user is a team member
    const idea = await Idea.findById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    const isTeamMember = idea.author.toString() === userId.toString() || 
                        (idea.teamStructure?.teamComposition || []).some(member => 
                          member.user.toString() === userId.toString() && member.status === 'active'
                        );
    
    if (!isTeamMember) {
      throw new Error('Access denied');
    }

    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(searchQuery, 'i');

    const posts = await TeamPost.find({
      ideaId,
      $or: [
        { content: searchRegex },
        { 'comments.content': searchRegex }
      ]
    })
    .populate('author', 'firstName fullName avatar role')
    .populate('mentions.user', 'firstName fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    return posts;
  }
}

export default new TeamPostService();
