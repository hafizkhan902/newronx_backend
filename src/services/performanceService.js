import mongoose from 'mongoose';
import Idea from '../models/idea.model.js';
import Task from '../models/task.model.js';
import Message from '../models/message.model.js';
import Chat from '../models/chat.model.js';
import TeamPost from '../models/teamPost.model.js';
import TeamFile from '../models/teamFile.model.js';
import User from '../models/user.model.js';
import TeamPerformance from '../models/teamPerformance.model.js';
import MemberPerformance from '../models/memberPerformance.model.js';
import PerformanceHistory from '../models/performanceHistory.model.js';
import PerformanceAlert from '../models/performanceAlert.model.js';
import { PerformanceCalculator } from '../utils/performanceCalculator.js';

export class PerformanceService {
  
  /**
   * Calculate comprehensive team performance
   * @param {string} ideaId - Idea/Team ID
   * @param {string} timeRange - Time range for calculation ('7d', '30d', '90d', 'all')
   * @param {boolean} forceRecalculation - Force recalculation even if recent data exists
   * @returns {Object} Team performance data
   */
  async calculateTeamPerformance(ideaId, timeRange = '30d', forceRecalculation = false) {
    try {
      console.log(`🔄 Starting performance calculation for idea ${ideaId}, timeRange: ${timeRange}`);
      
      // Check if recent calculation exists (unless forced)
      if (!forceRecalculation) {
        const recentCalculation = await TeamPerformance.getLatestPerformance(ideaId, timeRange);
        if (recentCalculation && this.isRecentCalculation(recentCalculation.calculationDate)) {
          console.log('📊 Using recent performance calculation');
          return await this.formatPerformanceResponse(recentCalculation);
        }
      }
      
      // Fetch all required data in parallel for better performance
      const [idea, tasks, messages, posts, files] = await Promise.all([
        this.getIdeaWithTeam(ideaId),
        this.getTasksData(ideaId, timeRange),
        this.getMessagesData(ideaId, timeRange),
        this.getPostsData(ideaId, timeRange),
        this.getFilesData(ideaId, timeRange)
      ]);
      
      if (!idea) {
        throw new Error('Idea not found');
      }
      
      if (!idea.teamStructure?.teamComposition?.length) {
        throw new Error('No team members found for performance calculation');
      }
      
      console.log(`📈 Calculating performance for ${idea.teamStructure.teamComposition.length} team members`);
      
      // Calculate performance metrics using PerformanceCalculator
      const performanceData = PerformanceCalculator.calculateTeamPerformance(
        idea.teamStructure.teamComposition,
        tasks,
        messages,
        posts,
        files,
        timeRange
      );
      
      // Save performance data to database
      const savedPerformance = await this.savePerformanceData(ideaId, performanceData, timeRange);
      
      // Check for performance alerts
      await this.checkPerformanceAlerts(ideaId, idea.author, performanceData);
      
      console.log('✅ Performance calculation completed successfully');
      
      return await this.formatPerformanceResponse(savedPerformance, performanceData);
      
    } catch (error) {
      console.error('❌ Performance calculation failed:', error);
      throw new Error(`Performance calculation failed: ${error.message}`);
    }
  }
  
  /**
   * Get team performance dashboard data
   * @param {string} ideaId - Idea/Team ID
   * @param {string} timeRange - Time range
   * @param {boolean} includeMembers - Include member performance data
   * @param {boolean} includeInsights - Include insights and recommendations
   * @returns {Object} Dashboard data
   */
  async getPerformanceDashboard(ideaId, timeRange = '30d', includeMembers = true, includeInsights = true) {
    try {
      // Try to get latest performance data
      let performanceData = await TeamPerformance.getLatestPerformance(ideaId, timeRange);
      
      // If no recent data, calculate new performance
      if (!performanceData || !this.isRecentCalculation(performanceData.calculationDate)) {
        console.log('🔄 No recent performance data found, calculating...');
        return await this.calculateTeamPerformance(ideaId, timeRange);
      }
      
      // Get member performance data if requested
      let memberPerformances = [];
      if (includeMembers) {
        memberPerformances = await MemberPerformance.find({ 
          teamPerformanceId: performanceData._id 
        })
        .populate('userId', 'firstName fullName avatar')
        .lean();
      }
      
      return this.formatDashboardResponse(performanceData, memberPerformances, includeInsights);
      
    } catch (error) {
      console.error('❌ Error getting performance dashboard:', error);
      throw error;
    }
  }
  
  /**
   * Get individual member performance details
   * @param {string} ideaId - Idea/Team ID
   * @param {string} memberId - Member ID
   * @param {string} timeRange - Time range
   * @returns {Object} Member performance details
   */
  async getMemberPerformance(ideaId, memberId, timeRange = '30d') {
    try {
      // Get latest team performance
      const teamPerformance = await TeamPerformance.getLatestPerformance(ideaId, timeRange);
      if (!teamPerformance) {
        throw new Error('No performance data found for this team');
      }
      
      // Get member performance
      const memberPerformance = await MemberPerformance.findOne({
        teamPerformanceId: teamPerformance._id,
        memberId: new mongoose.Types.ObjectId(memberId)
      })
      .populate('userId', 'firstName fullName avatar email')
      .lean();
      
      if (!memberPerformance) {
        throw new Error('Member performance data not found');
      }
      
      // Get historical data for trends
      const historicalData = await PerformanceHistory.getUserTrends(
        memberPerformance.userId._id, 
        ideaId, 
        30
      );
      
      // Get performance insights
      const insights = await PerformanceHistory.getPerformanceInsights(
        memberPerformance.userId._id,
        ideaId,
        30
      );
      
      return {
        member: {
          _id: memberPerformance.memberId,
          user: memberPerformance.userId,
          role: memberPerformance.user?.role || 'Team Member'
        },
        performance: {
          overall: memberPerformance.overall,
          tasks: memberPerformance.tasks,
          communication: memberPerformance.communication,
          collaboration: memberPerformance.collaboration,
          contribution: memberPerformance.contribution
        },
        historicalData,
        insights: insights.insights || [],
        recommendations: memberPerformance.recommendations || [],
        trends: {
          overall: insights.overallTrend || { direction: 'stable', change: 0 }
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting member performance:', error);
      throw error;
    }
  }
  
  /**
   * Get performance history and trends
   * @param {string} ideaId - Idea/Team ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @param {string} granularity - Data granularity ('daily', 'weekly', 'monthly')
   * @returns {Object} Historical performance data
   */
  async getPerformanceHistory(ideaId, startDate, endDate, granularity = 'daily') {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Get team trends
      const teamTrends = await PerformanceHistory.getTeamTrends(ideaId, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      
      // Get individual member trends
      const idea = await this.getIdeaWithTeam(ideaId);
      if (!idea?.teamStructure?.teamComposition) {
        throw new Error('Team data not found');
      }
      
      const memberTrends = await Promise.all(
        idea.teamStructure.teamComposition.map(async (member) => {
          const trends = await PerformanceHistory.getUserTrends(
            member.user,
            ideaId,
            Math.ceil((end - start) / (1000 * 60 * 60 * 24))
          );
          
          return {
            userId: member.user,
            memberId: member._id,
            trends
          };
        })
      );
      
      // Format data based on granularity
      const formattedData = this.formatHistoricalData(teamTrends, memberTrends, granularity);
      
      return {
        timeRange: {
          start: startDate,
          end: endDate,
          granularity
        },
        teamTrends: formattedData.team,
        memberTrends: formattedData.members,
        summary: this.generateHistoricalSummary(teamTrends)
      };
      
    } catch (error) {
      console.error('❌ Error getting performance history:', error);
      throw error;
    }
  }
  
  /**
   * Get performance alerts for idea author
   * @param {string} authorId - Idea author ID
   * @param {string} ideaId - Idea ID (optional, for specific idea)
   * @returns {Array} Performance alerts
   */
  async getPerformanceAlerts(authorId, ideaId = null) {
    try {
      const alerts = await PerformanceAlert.getUnreadAlerts(authorId, ideaId);
      
      // Get alert statistics
      const stats = await PerformanceAlert.getAlertStats(authorId);
      
      return {
        alerts,
        statistics: stats[0] || {
          totalAlerts: 0,
          criticalAlerts: 0,
          highAlerts: 0,
          resolvedAlerts: 0,
          unreadAlerts: 0,
          avgResolutionTimeHours: 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting performance alerts:', error);
      throw error;
    }
  }
  
  /**
   * Mark performance alert as read
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID
   * @returns {Object} Updated alert
   */
  async markAlertAsRead(alertId, userId) {
    try {
      const alert = await PerformanceAlert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      if (alert.authorId.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only mark your own alerts as read');
      }
      
      return await alert.markAsRead();
      
    } catch (error) {
      console.error('❌ Error marking alert as read:', error);
      throw error;
    }
  }
  
  /**
   * Resolve performance alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID
   * @param {string} notes - Resolution notes
   * @returns {Object} Updated alert
   */
  async resolveAlert(alertId, userId, notes = '') {
    try {
      const alert = await PerformanceAlert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }
      
      if (alert.authorId.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only resolve your own alerts');
      }
      
      return await alert.resolve(userId, notes);
      
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  /**
   * Get idea with team structure
   * @param {string} ideaId - Idea ID
   * @returns {Object} Idea with populated team
   */
  async getIdeaWithTeam(ideaId) {
    return await Idea.findById(ideaId)
      .populate('teamStructure.teamComposition.user', 'firstName fullName avatar email')
      .populate('author', 'firstName fullName avatar email')
      .lean();
  }
  
  /**
   * Get tasks data for performance calculation
   * @param {string} ideaId - Idea ID
   * @param {string} timeRange - Time range
   * @returns {Array} Tasks data
   */
  async getTasksData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await Task.find({
      idea: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    })
    .populate('assignments.user', 'firstName fullName avatar')
    .populate('createdBy', 'firstName fullName avatar')
    .lean();
  }
  
  /**
   * Get messages data for performance calculation
   * @param {string} ideaId - Idea ID
   * @param {string} timeRange - Time range
   * @returns {Array} Messages data
   */
  async getMessagesData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    // Get all chats for this idea/team using aggregation for better performance
    const messageData = await Message.aggregate([
      {
        $lookup: {
          from: 'chats',
          localField: 'chat',
          foreignField: '_id',
          as: 'chatInfo'
        }
      },
      {
        $match: {
          'chatInfo.metadata.ideaId': new mongoose.Types.ObjectId(ideaId),
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderInfo',
          pipeline: [{ $project: { firstName: 1, fullName: 1, avatar: 1, email: 1 } }]
        }
      },
      {
        $project: {
          content: 1,
          sender: { $arrayElemAt: ['$senderInfo', 0] },
          createdAt: 1,
          type: 1,
          reactions: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    return messageData;
  }
  
  /**
   * Get team posts data for performance calculation
   * @param {string} ideaId - Idea ID
   * @param {string} timeRange - Time range
   * @returns {Array} Posts data
   */
  async getPostsData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await TeamPost.find({
      ideaId: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    })
    .populate('author', 'firstName fullName avatar email')
    .populate('comments.author', 'firstName fullName avatar')
    .populate('likes.user', 'firstName fullName')
    .populate('mentions', 'firstName fullName')
    .lean();
  }
  
  /**
   * Get team files data for performance calculation
   * @param {string} ideaId - Idea ID
   * @param {string} timeRange - Time range
   * @returns {Array} Files data
   */
  async getFilesData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await TeamFile.find({
      ideaId: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    })
    .populate('uploadedBy', 'firstName fullName avatar email')
    .lean();
  }
  
  /**
   * Save performance data to database
   * @param {string} ideaId - Idea ID
   * @param {Object} performanceData - Calculated performance data
   * @param {string} timeRange - Time range
   * @returns {Object} Saved team performance
   */
  async savePerformanceData(ideaId, performanceData, timeRange) {
    try {
      // Save team performance
      const teamPerf = new TeamPerformance({
        ideaId: new mongoose.Types.ObjectId(ideaId),
        calculationDate: new Date(),
        timeRange,
        overall: performanceData.overall,
        tasks: performanceData.tasks,
        communication: performanceData.communication,
        engagement: performanceData.engagement,
        insights: performanceData.teamInsights || [],
        recommendations: performanceData.teamRecommendations || []
      });
      
      const savedTeamPerf = await teamPerf.save();
      
      // Save individual member performances
      const memberPerfPromises = (performanceData.members || []).map(async (memberData) => {
        const memberPerf = new MemberPerformance({
          teamPerformanceId: savedTeamPerf._id,
          memberId: memberData.memberId,
          userId: memberData.userId,
          overall: memberData.performance.overall,
          tasks: memberData.performance.tasks,
          communication: memberData.performance.communication,
          collaboration: memberData.performance.collaboration,
          contribution: memberData.performance.contribution,
          insights: memberData.insights || [],
          recommendations: memberData.recommendations || []
        });
        
        return await memberPerf.save();
      });
      
      await Promise.all(memberPerfPromises);
      
      // Save historical snapshots for trend analysis
      await this.savePerformanceHistory(ideaId, performanceData);
      
      console.log('✅ Performance data saved successfully');
      
      return savedTeamPerf;
      
    } catch (error) {
      console.error('❌ Error saving performance data:', error);
      throw error;
    }
  }
  
  /**
   * Save performance history for trend analysis
   * @param {string} ideaId - Idea ID
   * @param {Object} performanceData - Performance data
   */
  async savePerformanceHistory(ideaId, performanceData) {
    const historyPromises = (performanceData.members || []).map(async (memberData) => {
      const history = new PerformanceHistory({
        ideaId: new mongoose.Types.ObjectId(ideaId),
        userId: memberData.userId,
        date: new Date(),
        overallScore: memberData.performance.overall.score,
        taskScore: memberData.performance.tasks.score,
        communicationScore: memberData.performance.communication.score,
        collaborationScore: memberData.performance.collaboration.score,
        contributionScore: memberData.performance.contribution.score,
        metrics: {
          tasksCompleted: memberData.performance.tasks.completedTasks,
          responseTimeMs: memberData.performance.communication.avgResponseTimeMs,
          postsCreated: memberData.performance.collaboration.totalPosts,
          filesUploaded: memberData.performance.contribution.totalFiles
        }
      });
      
      return await history.save();
    });
    
    await Promise.all(historyPromises);
  }
  
  /**
   * Check for performance alerts and create them if needed
   * @param {string} ideaId - Idea ID
   * @param {string} authorId - Idea author ID
   * @param {Object} performanceData - Performance data
   */
  async checkPerformanceAlerts(ideaId, authorId, performanceData) {
    try {
      // Check for performance drops
      const strugglingMembers = performanceData.members?.filter(member => 
        member.performance.overall.score < 3.0
      ) || [];
      
      if (strugglingMembers.length > 0) {
        await PerformanceAlert.createPerformanceDropAlert(
          ideaId,
          authorId,
          strugglingMembers.map(member => ({
            userId: member.userId,
            memberId: member.memberId,
            currentScore: member.performance.overall.score,
            previousScore: member.performance.overall.score, // Would get from history in real implementation
            role: member.user.role
          }))
        );
      }
      
      // Check for deadline risks
      if (performanceData.tasks?.overdue > 0 || performanceData.tasks?.completionRate < 60) {
        const daysUntilDeadline = 7; // Would calculate from actual project deadline
        await PerformanceAlert.createDeadlineRiskAlert(ideaId, authorId, {
          overdueTasks: performanceData.tasks.overdue,
          atRiskTasks: performanceData.tasks.inProgress,
          daysUntilDeadline,
          affectedMembers: []
        });
      }
      
      // Check for low engagement
      if (performanceData.engagement?.avgEngagement < 3.0) {
        await PerformanceAlert.createLowEngagementAlert(ideaId, authorId, {
          avgEngagement: performanceData.engagement.avgEngagement,
          inactiveMembers: performanceData.members?.filter(m => 
            m.performance.communication.activityLevel === 'low'
          ).length || 0,
          inactiveDays: 7,
          affectedMembers: []
        });
      }
      
      // Check for team milestones
      if (performanceData.tasks?.completionRate >= 90) {
        await PerformanceAlert.createTeamMilestoneAlert(ideaId, authorId, {
          message: `Team achieved ${performanceData.tasks.completionRate}% task completion rate!`,
          metric: 'completion_rate',
          threshold: 90
        });
      }
      
    } catch (error) {
      console.error('❌ Error checking performance alerts:', error);
      // Don't throw error here as alerts are not critical for performance calculation
    }
  }
  
  /**
   * Get date filter for time range
   * @param {string} timeRange - Time range ('7d', '30d', '90d', 'all')
   * @returns {Date} Date filter
   */
  getDateFilter(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      case 'all':
      default:
        return new Date('2020-01-01'); // All time
    }
  }
  
  /**
   * Check if calculation is recent (within 1 hour)
   * @param {Date} calculationDate - Calculation date
   * @returns {boolean} Is recent
   */
  isRecentCalculation(calculationDate) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(calculationDate) > hourAgo;
  }
  
  /**
   * Format performance response for API
   * @param {Object} teamPerformance - Team performance data
   * @param {Object} calculatedData - Calculated performance data (optional)
   * @returns {Object} Formatted response
   */
  async formatPerformanceResponse(teamPerformance, calculatedData = null) {
    // If we have calculated data, use it; otherwise get from database
    let memberPerformances = [];
    
    if (calculatedData?.members) {
      memberPerformances = calculatedData.members;
    } else {
      const dbMembers = await MemberPerformance.find({ 
        teamPerformanceId: teamPerformance._id 
      })
      .populate('userId', 'firstName fullName avatar')
      .lean();
      
      memberPerformances = dbMembers.map(member => ({
        memberId: member.memberId,
        userId: member.userId._id,
        user: {
          _id: member.userId._id,
          firstName: member.userId.firstName,
          fullName: member.userId.fullName,
          avatar: member.userId.avatar,
          role: 'Team Member'
        },
        performance: {
          overall: member.overall,
          tasks: member.tasks,
          communication: member.communication,
          collaboration: member.collaboration,
          contribution: member.contribution
        },
        insights: member.insights || [],
        recommendations: member.recommendations || []
      }));
    }
    
    return {
      teamId: teamPerformance.ideaId,
      calculationDate: teamPerformance.calculationDate || new Date(),
      timeRange: teamPerformance.timeRange,
      overall: teamPerformance.overall,
      tasks: teamPerformance.tasks,
      communication: teamPerformance.communication,
      engagement: teamPerformance.engagement,
      members: memberPerformances,
      teamInsights: teamPerformance.insights || [],
      teamRecommendations: teamPerformance.recommendations || []
    };
  }
  
  /**
   * Format dashboard response
   * @param {Object} teamPerformance - Team performance data
   * @param {Array} memberPerformances - Member performance data
   * @param {boolean} includeInsights - Include insights
   * @returns {Object} Dashboard response
   */
  formatDashboardResponse(teamPerformance, memberPerformances, includeInsights) {
    const response = {
      teamId: teamPerformance.ideaId,
      calculationDate: teamPerformance.calculationDate,
      timeRange: teamPerformance.timeRange,
      overall: teamPerformance.overall,
      tasks: teamPerformance.tasks,
      communication: teamPerformance.communication,
      engagement: teamPerformance.engagement,
      members: memberPerformances.map(member => ({
        memberId: member.memberId,
        user: {
          _id: member.userId._id,
          firstName: member.userId.firstName,
          fullName: member.userId.fullName,
          avatar: member.userId.avatar,
          role: 'Team Member'
        },
        performance: {
          overall: member.overall,
          tasks: member.tasks,
          communication: member.communication,
          collaboration: member.collaboration,
          contribution: member.contribution
        },
        insights: member.insights || [],
        recommendations: member.recommendations || []
      }))
    };
    
    if (includeInsights) {
      response.teamInsights = teamPerformance.insights || [];
      response.teamRecommendations = teamPerformance.recommendations || [];
    }
    
    return response;
  }
  
  /**
   * Format historical data based on granularity
   * @param {Array} teamTrends - Team trends data
   * @param {Array} memberTrends - Member trends data
   * @param {string} granularity - Data granularity
   * @returns {Object} Formatted historical data
   */
  formatHistoricalData(teamTrends, memberTrends, granularity) {
    // This would implement data aggregation based on granularity
    // For now, return raw data
    return {
      team: teamTrends,
      members: memberTrends
    };
  }
  
  /**
   * Generate historical summary
   * @param {Array} teamTrends - Team trends data
   * @returns {Object} Historical summary
   */
  generateHistoricalSummary(teamTrends) {
    if (!teamTrends.length) {
      return {
        trend: 'stable',
        change: 0,
        message: 'No historical data available'
      };
    }
    
    const firstRecord = teamTrends[0];
    const lastRecord = teamTrends[teamTrends.length - 1];
    
    const change = lastRecord.avgOverallScore - firstRecord.avgOverallScore;
    const changePercent = (change / firstRecord.avgOverallScore) * 100;
    
    let trend = 'stable';
    if (changePercent > 5) trend = 'improving';
    else if (changePercent < -5) trend = 'declining';
    
    return {
      trend,
      change: Math.round(changePercent * 100) / 100,
      message: `Team performance has ${trend === 'improving' ? 'improved' : trend === 'declining' ? 'declined' : 'remained stable'} over the selected period`
    };
  }
}

export default new PerformanceService();
