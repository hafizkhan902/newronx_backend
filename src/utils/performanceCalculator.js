/**
 * Performance Calculator Utility
 * Implements weighted scoring formulas for team and individual performance metrics
 */

export class PerformanceCalculator {
  
  // Weights for individual performance calculation
  static INDIVIDUAL_WEIGHTS = {
    tasks: 0.40,        // 40% - Task completion and quality
    communication: 0.25, // 25% - Response time and activity
    collaboration: 0.20, // 20% - Team interaction and engagement
    contribution: 0.15   // 15% - File sharing and knowledge contribution
  };
  
  // Weights for team performance calculation
  static TEAM_WEIGHTS = {
    taskCompletion: 0.40,  // 40% - Overall task completion rate
    averageQuality: 0.30,  // 30% - Average individual quality scores
    collaboration: 0.20,   // 20% - Team collaboration metrics
    velocity: 0.10         // 10% - Task completion velocity
  };
  
  /**
   * Calculate comprehensive team performance
   * @param {Array} teamMembers - Array of team member data
   * @param {Array} tasks - Array of task data
   * @param {Array} messages - Array of message data
   * @param {Array} posts - Array of team post data
   * @param {Array} files - Array of file data
   * @param {string} timeRange - Time range for calculation
   * @returns {Object} Comprehensive team performance data
   */
  static calculateTeamPerformance(teamMembers, tasks, messages, posts, files, timeRange = '30d') {
    const memberPerformances = teamMembers.map(member => 
      this.calculateMemberPerformance(member, tasks, messages, posts, files, timeRange)
    );
    
    // Calculate team-level metrics
    const teamTaskMetrics = this.calculateTeamTaskMetrics(tasks);
    const teamCommunicationMetrics = this.calculateTeamCommunicationMetrics(messages, teamMembers);
    const teamEngagementMetrics = this.calculateTeamEngagementMetrics(posts, files, teamMembers);
    
    // Calculate overall team scores
    const avgIndividualScore = memberPerformances.reduce((sum, mp) => sum + mp.performance.overall.score, 0) / memberPerformances.length || 0;
    const teamProductivity = this.calculateTeamProductivity(teamTaskMetrics, avgIndividualScore, teamEngagementMetrics);
    const teamQuality = avgIndividualScore;
    const teamVelocity = this.calculateTeamVelocity(tasks, timeRange);
    const teamCollaboration = this.calculateTeamCollaboration(posts, messages, teamMembers);
    
    // Generate insights and recommendations
    const teamInsights = this.generateTeamInsights(teamTaskMetrics, teamCommunicationMetrics, teamEngagementMetrics, memberPerformances);
    const teamRecommendations = this.generateTeamRecommendations(teamTaskMetrics, memberPerformances);
    
    return {
      timeRange,
      overall: {
        productivity: Math.round(teamProductivity),
        quality: Math.round(teamQuality * 100) / 100,
        velocity: Math.round(teamVelocity * 100) / 100,
        collaboration: Math.round(teamCollaboration * 100) / 100,
        avgResponseTimeMs: teamCommunicationMetrics.avgResponseTimeMs
      },
      tasks: teamTaskMetrics,
      communication: teamCommunicationMetrics,
      engagement: teamEngagementMetrics,
      members: memberPerformances,
      teamInsights,
      teamRecommendations
    };
  }
  
  /**
   * Calculate individual member performance
   * @param {Object} member - Team member data
   * @param {Array} tasks - Array of task data
   * @param {Array} messages - Array of message data
   * @param {Array} posts - Array of team post data
   * @param {Array} files - Array of file data
   * @param {string} timeRange - Time range for calculation
   * @returns {Object} Individual member performance data
   */
  static calculateMemberPerformance(member, tasks, messages, posts, files, timeRange) {
    const userId = member.user._id || member.user;
    
    // Filter data for this member
    const memberTasks = tasks.filter(task => 
      task.assignments?.some(assignment => 
        assignment.user.toString() === userId.toString()
      ) || task.createdBy?.toString() === userId.toString()
    );
    const memberMessages = messages.filter(msg => msg.sender?._id?.toString() === userId.toString());
    const memberPosts = posts.filter(post => post.author?._id?.toString() === userId.toString());
    const memberFiles = files.filter(file => file.uploadedBy?._id?.toString() === userId.toString());
    
    // Calculate performance metrics
    const taskPerformance = this.calculateTaskPerformance(memberTasks, userId);
    const communicationPerformance = this.calculateCommunicationPerformance(memberMessages, timeRange);
    const collaborationPerformance = this.calculateCollaborationPerformance(memberPosts, messages, userId);
    const contributionPerformance = this.calculateContributionPerformance(memberFiles, memberPosts);
    
    // Calculate weighted overall score
    const overallScore = (
      taskPerformance.score * this.INDIVIDUAL_WEIGHTS.tasks +
      communicationPerformance.score * this.INDIVIDUAL_WEIGHTS.communication +
      collaborationPerformance.score * this.INDIVIDUAL_WEIGHTS.collaboration +
      contributionPerformance.score * this.INDIVIDUAL_WEIGHTS.contribution
    );
    
    // Generate insights and recommendations
    const insights = this.generateMemberInsights(taskPerformance, communicationPerformance, collaborationPerformance, contributionPerformance);
    const recommendations = this.generateMemberRecommendations(taskPerformance, communicationPerformance, collaborationPerformance, contributionPerformance);
    
    return {
      memberId: member._id,
      userId: userId,
      user: {
        _id: userId,
        firstName: member.user.firstName,
        fullName: member.user.fullName,
        avatar: member.user.avatar,
        role: member.assignedRole || member.roleType
      },
      performance: {
        overall: {
          score: Math.round(overallScore * 100) / 100,
          grade: this.scoreToGrade(overallScore),
          trend: 'stable' // Will be calculated from historical data
        },
        tasks: taskPerformance,
        communication: communicationPerformance,
        collaboration: collaborationPerformance,
        contribution: contributionPerformance
      },
      insights,
      recommendations
    };
  }
  
  /**
   * Calculate task performance metrics
   * @param {Array} tasks - Member's tasks
   * @param {string} userId - Member's user ID
   * @returns {Object} Task performance metrics
   */
  static calculateTaskPerformance(tasks, userId) {
    if (tasks.length === 0) {
      return {
        score: 0,
        completionRate: 0,
        onTimeRate: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        avgCompletionTime: '0d',
        avgCompletionTimeMs: 0,
        priorityPerformance: 0
      };
    }
    
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
    const overdueTasks = tasks.filter(task => {
      const isOverdue = new Date() > new Date(task.deadline);
      return isOverdue && !['completed', 'cancelled'].includes(task.status);
    });
    
    // Calculate completion rate
    const completionRate = (completedTasks.length / tasks.length) * 100;
    
    // Calculate on-time rate
    const onTimeCompletedTasks = completedTasks.filter(task => {
      const completedAssignment = task.assignments?.find(a => 
        a.user.toString() === userId.toString() && a.completedAt
      );
      if (!completedAssignment) return false;
      return new Date(completedAssignment.completedAt) <= new Date(task.deadline);
    });
    const onTimeRate = completedTasks.length > 0 ? (onTimeCompletedTasks.length / completedTasks.length) * 100 : 0;
    
    // Calculate average completion time
    const completionTimes = completedTasks.map(task => {
      const assignment = task.assignments?.find(a => a.user.toString() === userId.toString());
      if (!assignment?.completedAt) return null;
      return new Date(assignment.completedAt) - new Date(assignment.assignedAt);
    }).filter(time => time !== null);
    
    const avgCompletionTimeMs = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;
    
    // Calculate priority performance (how well high-priority tasks are handled)
    const highPriorityTasks = tasks.filter(task => ['high', 'urgent'].includes(task.priority));
    const completedHighPriorityTasks = highPriorityTasks.filter(task => task.status === 'completed');
    const priorityPerformance = highPriorityTasks.length > 0 
      ? (completedHighPriorityTasks.length / highPriorityTasks.length) * 100 
      : 100;
    
    // Calculate task performance score (0-5)
    const completionScore = Math.min(completionRate / 20, 5); // Max 5 points for 100% completion
    const onTimeScore = Math.min(onTimeRate / 20, 5); // Max 5 points for 100% on-time
    const priorityScore = Math.min(priorityPerformance / 20, 5); // Max 5 points for priority handling
    const overdueScore = Math.max(0, 5 - (overdueTasks.length * 0.5)); // Penalty for overdue tasks
    
    const taskScore = (completionScore * 0.30 + onTimeScore * 0.30 + priorityScore * 0.20 + overdueScore * 0.20);
    
    return {
      score: Math.round(taskScore * 100) / 100,
      completionRate: Math.round(completionRate),
      onTimeRate: Math.round(onTimeRate),
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueTasks: overdueTasks.length,
      avgCompletionTime: this.formatDuration(avgCompletionTimeMs),
      avgCompletionTimeMs: Math.round(avgCompletionTimeMs),
      priorityPerformance: Math.round(priorityPerformance)
    };
  }
  
  /**
   * Calculate communication performance metrics
   * @param {Array} messages - Member's messages
   * @param {string} timeRange - Time range for calculation
   * @returns {Object} Communication performance metrics
   */
  static calculateCommunicationPerformance(messages, timeRange) {
    if (messages.length === 0) {
      return {
        score: 0,
        avgResponseTime: '0h',
        avgResponseTimeMs: 0,
        messagesPerDay: 0,
        totalMessages: 0,
        activityLevel: 'low',
        avgMessageLength: 0,
        daysActive: 0
      };
    }
    
    const totalMessages = messages.length;
    const daysInRange = this.getDaysFromTimeRange(timeRange);
    const messagesPerDay = totalMessages / daysInRange;
    
    // Calculate average message length
    const totalMessageLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    const avgMessageLength = totalMessageLength / totalMessages;
    
    // Calculate days active (days with at least one message)
    const activeDays = new Set(
      messages.map(msg => new Date(msg.createdAt).toDateString())
    ).size;
    
    // Calculate response time (simplified - would need conversation threading in real implementation)
    const avgResponseTimeMs = this.calculateAverageResponseTime(messages);
    
    // Determine activity level
    let activityLevel = 'low';
    if (messagesPerDay >= 5) activityLevel = 'high';
    else if (messagesPerDay >= 2) activityLevel = 'medium';
    
    // Calculate communication score (0-5)
    const responseTimeScore = this.getResponseTimeScore(avgResponseTimeMs);
    const activityScore = Math.min(messagesPerDay / 2, 5); // Max 5 points for 10+ messages/day
    const qualityScore = Math.min(avgMessageLength / 20, 5); // Max 5 points for 100+ char messages
    
    const communicationScore = (responseTimeScore * 0.40 + activityScore * 0.35 + qualityScore * 0.25);
    
    return {
      score: Math.round(communicationScore * 100) / 100,
      avgResponseTime: this.formatDuration(avgResponseTimeMs),
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      messagesPerDay: Math.round(messagesPerDay * 10) / 10,
      totalMessages,
      activityLevel,
      avgMessageLength: Math.round(avgMessageLength),
      daysActive: activeDays
    };
  }
  
  /**
   * Calculate collaboration performance metrics
   * @param {Array} posts - Member's posts
   * @param {Array} allMessages - All messages (for mention analysis)
   * @param {string} userId - Member's user ID
   * @returns {Object} Collaboration performance metrics
   */
  static calculateCollaborationPerformance(posts, allMessages, userId) {
    const totalPosts = posts.length;
    
    if (totalPosts === 0) {
      return {
        score: 0,
        totalPosts: 0,
        avgLikesPerPost: 0,
        avgCommentsPerPost: 0,
        mentionCount: 0,
        knowledgeSharing: 0,
        engagementRate: 0
      };
    }
    
    // Calculate average likes and comments per post
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const avgLikesPerPost = totalLikes / totalPosts;
    const avgCommentsPerPost = totalComments / totalPosts;
    
    // Calculate mention count (how often this member mentions others)
    const mentionCount = this.calculateMentionCount(posts, allMessages, userId);
    
    // Calculate knowledge sharing score (posts with attachments, helpful content)
    const knowledgeSharingPosts = posts.filter(post => 
      post.attachments?.length > 0 || 
      post.content?.length > 100 || 
      post.likes?.length > 2
    );
    const knowledgeSharing = knowledgeSharingPosts.length;
    
    // Calculate engagement rate (0-10 scale)
    const engagementRate = Math.min((avgLikesPerPost + avgCommentsPerPost) * 2, 10);
    
    // Calculate collaboration score (0-5)
    const engagementScore = Math.min(engagementRate / 2, 5); // Max 5 points
    const mentionScore = Math.min(mentionCount / 5, 5); // Max 5 points for 25+ mentions
    const knowledgeScore = Math.min(knowledgeSharing / 2, 5); // Max 5 points for 10+ knowledge posts
    const activityScore = Math.min(totalPosts / 5, 5); // Max 5 points for 25+ posts
    
    const collaborationScore = (
      engagementScore * 0.30 + 
      mentionScore * 0.25 + 
      knowledgeScore * 0.25 + 
      activityScore * 0.20
    );
    
    return {
      score: Math.round(collaborationScore * 100) / 100,
      totalPosts,
      avgLikesPerPost: Math.round(avgLikesPerPost * 10) / 10,
      avgCommentsPerPost: Math.round(avgCommentsPerPost * 10) / 10,
      mentionCount,
      knowledgeSharing,
      engagementRate: Math.round(engagementRate * 10) / 10
    };
  }
  
  /**
   * Calculate contribution performance metrics
   * @param {Array} files - Member's uploaded files
   * @param {Array} posts - Member's posts (for contribution analysis)
   * @returns {Object} Contribution performance metrics
   */
  static calculateContributionPerformance(files, posts) {
    const totalFiles = files.length;
    
    if (totalFiles === 0 && posts.length === 0) {
      return {
        score: 0,
        totalFiles: 0,
        totalDownloads: 0,
        avgDownloadsPerFile: 0,
        documentFiles: 0,
        codeFiles: 0,
        designFiles: 0,
        diversityScore: 0,
        contributionTypes: []
      };
    }
    
    // Categorize files by type
    const documentFiles = files.filter(file => 
      ['pdf', 'doc', 'docx', 'txt'].some(ext => file.originalName?.toLowerCase().includes(ext))
    ).length;
    
    const codeFiles = files.filter(file => 
      ['js', 'ts', 'py', 'java', 'cpp', 'html', 'css'].some(ext => file.originalName?.toLowerCase().includes(ext))
    ).length;
    
    const designFiles = files.filter(file => 
      ['png', 'jpg', 'jpeg', 'gif', 'svg', 'psd', 'ai', 'figma'].some(ext => file.originalName?.toLowerCase().includes(ext))
    ).length;
    
    // Calculate total downloads (simplified - would need actual download tracking)
    const totalDownloads = files.reduce((sum, file) => sum + (file.downloadCount || 0), 0);
    const avgDownloadsPerFile = totalFiles > 0 ? totalDownloads / totalFiles : 0;
    
    // Calculate diversity score (0-5 based on variety of contributions)
    const contributionTypes = [];
    if (documentFiles > 0) contributionTypes.push('documentation');
    if (codeFiles > 0) contributionTypes.push('code');
    if (designFiles > 0) contributionTypes.push('design');
    if (posts.length > 0) contributionTypes.push('communication');
    
    const diversityScore = Math.min(contributionTypes.length * 1.25, 5);
    
    // Calculate contribution score (0-5)
    const fileScore = Math.min(totalFiles / 3, 5); // Max 5 points for 15+ files
    const downloadScore = Math.min(avgDownloadsPerFile / 2, 5); // Max 5 points for 10+ avg downloads
    const diversityScoreWeighted = diversityScore;
    const communicationScore = Math.min(posts.length / 10, 5); // Max 5 points for 50+ posts
    
    const contributionScore = (
      fileScore * 0.35 + 
      downloadScore * 0.25 + 
      diversityScoreWeighted * 0.25 + 
      communicationScore * 0.15
    );
    
    return {
      score: Math.round(contributionScore * 100) / 100,
      totalFiles,
      totalDownloads,
      avgDownloadsPerFile: Math.round(avgDownloadsPerFile * 10) / 10,
      documentFiles,
      codeFiles,
      designFiles,
      diversityScore: Math.round(diversityScore * 100) / 100,
      contributionTypes
    };
  }
  
  /**
   * Calculate team-level task metrics
   * @param {Array} tasks - All team tasks
   * @returns {Object} Team task metrics
   */
  static calculateTeamTaskMetrics(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const overdue = tasks.filter(task => {
      const isOverdue = new Date() > new Date(task.deadline);
      return isOverdue && !['completed', 'cancelled'].includes(task.status);
    }).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate
    };
  }
  
  /**
   * Calculate team communication metrics
   * @param {Array} messages - All team messages
   * @param {Array} teamMembers - Team members
   * @returns {Object} Team communication metrics
   */
  static calculateTeamCommunicationMetrics(messages, teamMembers) {
    const totalMessages = messages.length;
    const uniqueSenders = new Set(messages.map(msg => msg.sender?._id?.toString())).size;
    const activeMembers = Math.min(uniqueSenders, teamMembers.length);
    
    // Calculate average response time across all members
    const avgResponseTimeMs = this.calculateAverageResponseTime(messages);
    
    // Calculate engagement rate (messages per member per day)
    const daysInPeriod = 30; // Assuming 30-day period
    const avgEngagementRate = totalMessages / (teamMembers.length * daysInPeriod);
    
    return {
      totalMessages,
      activeMembers,
      avgResponseTime: this.formatDuration(avgResponseTimeMs),
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100
    };
  }
  
  /**
   * Calculate team engagement metrics
   * @param {Array} posts - All team posts
   * @param {Array} files - All team files
   * @param {Array} teamMembers - Team members
   * @returns {Object} Team engagement metrics
   */
  static calculateTeamEngagementMetrics(posts, files, teamMembers) {
    const totalPosts = posts.length;
    const totalFiles = files.length;
    
    // Calculate average engagement (likes + comments per post)
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const avgEngagement = totalPosts > 0 ? (totalLikes + totalComments) / totalPosts : 0;
    
    // Calculate knowledge sharing score
    const knowledgePosts = posts.filter(post => 
      post.attachments?.length > 0 || post.content?.length > 100
    ).length;
    const knowledgeSharingScore = Math.min((knowledgePosts + totalFiles) / teamMembers.length, 5);
    
    return {
      totalPosts,
      totalFiles,
      avgEngagement: Math.round(avgEngagement * 10) / 10,
      knowledgeSharingScore: Math.round(knowledgeSharingScore * 100) / 100
    };
  }
  
  /**
   * Calculate team productivity score
   * @param {Object} taskMetrics - Team task metrics
   * @param {number} avgIndividualScore - Average individual performance score
   * @param {Object} engagementMetrics - Team engagement metrics
   * @returns {number} Team productivity score (0-100)
   */
  static calculateTeamProductivity(taskMetrics, avgIndividualScore, engagementMetrics) {
    const taskScore = taskMetrics.completionRate; // 0-100
    const qualityScore = (avgIndividualScore / 5) * 100; // Convert 0-5 to 0-100
    const engagementScore = Math.min(engagementMetrics.avgEngagement * 10, 100); // 0-100
    
    return (
      taskScore * this.TEAM_WEIGHTS.taskCompletion +
      qualityScore * this.TEAM_WEIGHTS.averageQuality +
      engagementScore * this.TEAM_WEIGHTS.collaboration
    );
  }
  
  /**
   * Calculate team velocity (tasks per week)
   * @param {Array} tasks - All team tasks
   * @param {string} timeRange - Time range
   * @returns {number} Team velocity
   */
  static calculateTeamVelocity(tasks, timeRange) {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const daysInRange = this.getDaysFromTimeRange(timeRange);
    const weeksInRange = daysInRange / 7;
    
    return weeksInRange > 0 ? completedTasks.length / weeksInRange : 0;
  }
  
  /**
   * Calculate team collaboration score
   * @param {Array} posts - All team posts
   * @param {Array} messages - All team messages
   * @param {Array} teamMembers - Team members
   * @returns {number} Team collaboration score (0-5)
   */
  static calculateTeamCollaboration(posts, messages, teamMembers) {
    if (teamMembers.length === 0) return 0;
    
    // Calculate cross-member interactions
    const totalInteractions = posts.length + messages.length;
    const interactionsPerMember = totalInteractions / teamMembers.length;
    
    // Calculate mention frequency (simplified)
    const mentionCount = posts.reduce((sum, post) => 
      sum + (post.mentions?.length || 0), 0
    );
    
    const collaborationScore = Math.min(
      (interactionsPerMember / 10) + (mentionCount / teamMembers.length / 5),
      5
    );
    
    return collaborationScore;
  }
  
  // Helper methods
  
  /**
   * Convert performance score to letter grade
   * @param {number} score - Performance score (0-5)
   * @returns {string} Letter grade
   */
  static scoreToGrade(score) {
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
  }
  
  /**
   * Get number of days from time range string
   * @param {string} timeRange - Time range ('7d', '30d', '90d', 'all')
   * @returns {number} Number of days
   */
  static getDaysFromTimeRange(timeRange) {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case 'all': return 365; // Default to 1 year for "all"
      default: return 30;
    }
  }
  
  /**
   * Format duration in milliseconds to human-readable string
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    if (!ms || ms === 0) return '0h';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    } else if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }
  
  /**
   * Calculate average response time from messages (simplified)
   * @param {Array} messages - Array of messages
   * @returns {number} Average response time in milliseconds
   */
  static calculateAverageResponseTime(messages) {
    // Simplified calculation - in real implementation would need conversation threading
    if (messages.length < 2) return 0;
    
    const sortedMessages = messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const responseTimes = [];
    
    for (let i = 1; i < sortedMessages.length; i++) {
      const timeDiff = new Date(sortedMessages[i].createdAt) - new Date(sortedMessages[i-1].createdAt);
      if (timeDiff < 24 * 60 * 60 * 1000) { // Only consider responses within 24 hours
        responseTimes.push(timeDiff);
      }
    }
    
    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
  }
  
  /**
   * Get response time score (0-5) based on average response time
   * @param {number} avgResponseTimeMs - Average response time in milliseconds
   * @returns {number} Response time score
   */
  static getResponseTimeScore(avgResponseTimeMs) {
    const hours = avgResponseTimeMs / (1000 * 60 * 60);
    
    if (hours <= 1) return 5;      // Excellent: <= 1 hour
    if (hours <= 4) return 4;      // Good: 1-4 hours
    if (hours <= 8) return 3;      // Average: 4-8 hours
    if (hours <= 24) return 2;     // Below average: 8-24 hours
    if (hours <= 48) return 1;     // Poor: 24-48 hours
    return 0;                      // Very poor: > 48 hours
  }
  
  /**
   * Calculate mention count for collaboration analysis
   * @param {Array} posts - Member's posts
   * @param {Array} messages - All messages
   * @param {string} userId - Member's user ID
   * @returns {number} Mention count
   */
  static calculateMentionCount(posts, messages, userId) {
    const postMentions = posts.reduce((sum, post) => sum + (post.mentions?.length || 0), 0);
    
    // Count mentions in messages (simplified - would need proper mention parsing)
    const messageMentions = messages
      .filter(msg => msg.sender?._id?.toString() === userId.toString())
      .reduce((sum, msg) => {
        // Simple mention detection (looking for @username patterns)
        const mentionMatches = (msg.content || '').match(/@\w+/g);
        return sum + (mentionMatches ? mentionMatches.length : 0);
      }, 0);
    
    return postMentions + messageMentions;
  }
  
  /**
   * Generate team-level insights
   * @param {Object} taskMetrics - Team task metrics
   * @param {Object} communicationMetrics - Team communication metrics
   * @param {Object} engagementMetrics - Team engagement metrics
   * @param {Array} memberPerformances - Individual member performances
   * @returns {Array} Array of insights
   */
  static generateTeamInsights(taskMetrics, communicationMetrics, engagementMetrics, memberPerformances) {
    const insights = [];
    
    // Task completion insights
    if (taskMetrics.completionRate >= 90) {
      insights.push({
        type: 'success',
        title: 'Excellent Task Completion',
        message: `Team has a ${taskMetrics.completionRate}% task completion rate`,
        category: 'tasks'
      });
    } else if (taskMetrics.completionRate < 60) {
      insights.push({
        type: 'warning',
        title: 'Low Task Completion Rate',
        message: `Only ${taskMetrics.completionRate}% of tasks completed. Consider reviewing workload distribution`,
        category: 'tasks'
      });
    }
    
    // Communication insights
    if (communicationMetrics.avgEngagementRate > 2) {
      insights.push({
        type: 'success',
        title: 'Active Team Communication',
        message: `High communication activity with ${communicationMetrics.totalMessages} messages`,
        category: 'communication'
      });
    } else if (communicationMetrics.avgEngagementRate < 0.5) {
      insights.push({
        type: 'warning',
        title: 'Low Communication Activity',
        message: 'Team communication is below optimal levels. Consider daily standups',
        category: 'communication'
      });
    }
    
    // Performance distribution insights
    const highPerformers = memberPerformances.filter(mp => mp.performance.overall.score >= 4.0).length;
    const lowPerformers = memberPerformances.filter(mp => mp.performance.overall.score < 3.0).length;
    
    if (highPerformers >= memberPerformances.length * 0.7) {
      insights.push({
        type: 'success',
        title: 'Strong Team Performance',
        message: `${highPerformers} out of ${memberPerformances.length} members are high performers`,
        category: 'overall'
      });
    } else if (lowPerformers > memberPerformances.length * 0.3) {
      insights.push({
        type: 'warning',
        title: 'Performance Concerns',
        message: `${lowPerformers} members need performance improvement support`,
        category: 'overall'
      });
    }
    
    return insights;
  }
  
  /**
   * Generate team-level recommendations
   * @param {Object} taskMetrics - Team task metrics
   * @param {Array} memberPerformances - Individual member performances
   * @returns {Array} Array of recommendations
   */
  static generateTeamRecommendations(taskMetrics, memberPerformances) {
    const recommendations = [];
    
    // Task-based recommendations
    if (taskMetrics.overdue > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Address Overdue Tasks',
        description: `${taskMetrics.overdue} tasks are overdue. Review deadlines and redistribute if necessary`,
        category: 'tasks'
      });
    }
    
    if (taskMetrics.completionRate < 80) {
      recommendations.push({
        priority: 'medium',
        action: 'Improve Task Management',
        description: 'Consider implementing daily standups and better task tracking',
        category: 'tasks'
      });
    }
    
    // Performance-based recommendations
    const strugglingMembers = memberPerformances.filter(mp => mp.performance.overall.score < 3.0);
    if (strugglingMembers.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Implement Mentoring Program',
        description: `${strugglingMembers.length} members need additional support. Pair with high performers`,
        category: 'team'
      });
    }
    
    // Communication recommendations
    const lowCommunicators = memberPerformances.filter(mp => mp.performance.communication.score < 3.0);
    if (lowCommunicators.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Improve Team Communication',
        description: 'Some members have low communication scores. Consider regular check-ins',
        category: 'communication'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate individual member insights
   * @param {Object} taskPerf - Task performance
   * @param {Object} commPerf - Communication performance
   * @param {Object} collabPerf - Collaboration performance
   * @param {Object} contribPerf - Contribution performance
   * @returns {Array} Array of insights
   */
  static generateMemberInsights(taskPerf, commPerf, collabPerf, contribPerf) {
    const insights = [];
    
    // Task insights
    if (taskPerf.completionRate >= 90) {
      insights.push({
        type: 'success',
        message: 'Excellent task completion rate',
        category: 'tasks'
      });
    } else if (taskPerf.completionRate < 60) {
      insights.push({
        type: 'warning',
        message: 'Task completion rate needs improvement',
        category: 'tasks'
      });
    }
    
    if (taskPerf.onTimeRate >= 90) {
      insights.push({
        type: 'success',
        message: 'Very reliable with deadlines',
        category: 'tasks'
      });
    }
    
    // Communication insights
    if (commPerf.activityLevel === 'high') {
      insights.push({
        type: 'success',
        message: 'Very active team communicator',
        category: 'communication'
      });
    } else if (commPerf.activityLevel === 'low') {
      insights.push({
        type: 'info',
        message: 'Could benefit from more active communication',
        category: 'communication'
      });
    }
    
    // Collaboration insights
    if (collabPerf.mentionCount > 10) {
      insights.push({
        type: 'success',
        message: 'Great at helping and mentioning team members',
        category: 'collaboration'
      });
    }
    
    return insights;
  }
  
  /**
   * Generate individual member recommendations
   * @param {Object} taskPerf - Task performance
   * @param {Object} commPerf - Communication performance
   * @param {Object} collabPerf - Collaboration performance
   * @param {Object} contribPerf - Contribution performance
   * @returns {Array} Array of recommendations
   */
  static generateMemberRecommendations(taskPerf, commPerf, collabPerf, contribPerf) {
    const recommendations = [];
    
    // Task recommendations
    if (taskPerf.completionRate < 70) {
      recommendations.push({
        priority: 'high',
        action: 'Improve Task Management',
        description: 'Focus on completing assigned tasks. Consider time management techniques',
        category: 'tasks'
      });
    }
    
    if (taskPerf.overdueTasks > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Address Overdue Tasks',
        description: 'Prioritize completing overdue tasks and communicate delays early',
        category: 'tasks'
      });
    }
    
    // Communication recommendations
    if (commPerf.activityLevel === 'low') {
      recommendations.push({
        priority: 'medium',
        action: 'Increase Communication',
        description: 'Participate more actively in team discussions and updates',
        category: 'communication'
      });
    }
    
    // Collaboration recommendations
    if (collabPerf.totalPosts < 5) {
      recommendations.push({
        priority: 'low',
        action: 'Share More Updates',
        description: 'Consider sharing more project updates and insights with the team',
        category: 'collaboration'
      });
    }
    
    return recommendations;
  }
}
