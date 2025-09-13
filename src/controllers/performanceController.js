import BaseController from './baseController.js';
import { PerformanceService } from '../services/performanceService.js';
import { ResponseService } from '../services/responseService.js';

/**
 * Performance Controller
 * Handles all performance analytics API endpoints with proper access control
 */
class PerformanceController extends BaseController {
  constructor() {
    super();
    this.performanceService = new PerformanceService();
  }
  
  /**
   * Get team performance dashboard
   * GET /api/performance/:ideaId/dashboard
   */
  getDashboard = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const { 
      timeRange = '30d', 
      includeMembers = 'true', 
      includeInsights = 'true' 
    } = req.query;
    
    try {
      console.log(`📊 Getting performance dashboard for idea ${ideaId}`);
      
      const performanceData = await this.performanceService.getPerformanceDashboard(
        ideaId,
        timeRange,
        includeMembers === 'true',
        includeInsights === 'true'
      );
      
      return ResponseService.success(res, 'Team performance data retrieved successfully', performanceData);
      
    } catch (error) {
      console.error('Performance dashboard error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, error.message);
      }
      
      if (error.message.includes('No team members')) {
        return ResponseService.badRequest(res, 'No team members found for performance calculation');
      }
      
      return ResponseService.error(res, 'Failed to retrieve performance data', 500);
    }
  });
  
  /**
   * Trigger performance recalculation
   * POST /api/performance/:ideaId/recalculate
   */
  recalculatePerformance = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const { force = false, timeRange = '30d' } = req.body;
    
    try {
      console.log(`🔄 Triggering performance recalculation for idea ${ideaId}`);
      
      // Check if recent calculation exists (unless forced)
      if (!force) {
        const recentCalculation = await this.performanceService.checkRecentCalculation(ideaId, timeRange);
        if (recentCalculation) {
          return ResponseService.tooManyRequests(res, 
            'Performance was calculated recently. Use force=true to override.', {
              lastCalculation: recentCalculation.calculationDate,
              nextAllowedCalculation: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
              forceOverride: true
            }
          );
        }
      }
      
      // Generate calculation ID for tracking
      const calculationId = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start async calculation (don't wait for completion)
      this.performanceService.calculateTeamPerformance(ideaId, timeRange, true)
        .then((result) => {
          console.log(`✅ Performance calculation completed: ${calculationId}`);
        })
        .catch((error) => {
          console.error(`❌ Performance calculation failed: ${calculationId}`, error);
        });
      
      return ResponseService.success(res, 'Performance recalculation triggered', {
        calculationId,
        estimatedCompletionTime: new Date(Date.now() + 30000), // 30 seconds
        status: 'processing',
        timeRange,
        forced: force
      }, 202); // Accepted status
      
    } catch (error) {
      console.error('Performance recalculation error:', error);
      return ResponseService.error(res, 'Failed to trigger performance recalculation', 500);
    }
  });
  
  /**
   * Get individual member performance
   * GET /api/performance/:ideaId/members/:memberId
   */
  getMemberPerformance = this.asyncHandler(async (req, res) => {
    const { ideaId, memberId } = req.params;
    const { timeRange = '30d' } = req.query;
    
    try {
      console.log(`👤 Getting member performance for member ${memberId} in idea ${ideaId}`);
      
      const memberData = await this.performanceService.getMemberPerformance(
        ideaId, 
        memberId, 
        timeRange
      );
      
      return ResponseService.success(res, 'Member performance data retrieved successfully', memberData);
      
    } catch (error) {
      console.error('Member performance error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to retrieve member performance data', 500);
    }
  });
  
  /**
   * Get performance history and trends
   * GET /api/performance/:ideaId/history
   */
  getPerformanceHistory = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const { 
      startDate, 
      endDate, 
      granularity = 'daily',
      userId = null 
    } = req.query;
    
    try {
      // Validate date parameters
      if (!startDate || !endDate) {
        return ResponseService.badRequest(res, 'Start date and end date are required');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return ResponseService.badRequest(res, 'Invalid date format. Use ISO date strings');
      }
      
      if (start >= end) {
        return ResponseService.badRequest(res, 'Start date must be before end date');
      }
      
      // Limit date range to prevent excessive data
      const maxDays = 365; // 1 year
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        return ResponseService.badRequest(res, `Date range too large. Maximum ${maxDays} days allowed`);
      }
      
      console.log(`📈 Getting performance history for idea ${ideaId} from ${startDate} to ${endDate}`);
      
      const historyData = await this.performanceService.getPerformanceHistory(
        ideaId,
        startDate,
        endDate,
        granularity
      );
      
      return ResponseService.success(res, 'Performance history retrieved successfully', historyData);
      
    } catch (error) {
      console.error('Performance history error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to retrieve performance history', 500);
    }
  });
  
  /**
   * Get performance alerts
   * GET /api/performance/:ideaId/alerts
   */
  getPerformanceAlerts = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const userId = req.user._id;
    
    try {
      console.log(`🚨 Getting performance alerts for idea ${ideaId}`);
      
      const alertsData = await this.performanceService.getPerformanceAlerts(userId, ideaId);
      
      return ResponseService.success(res, 'Performance alerts retrieved successfully', alertsData);
      
    } catch (error) {
      console.error('Performance alerts error:', error);
      return ResponseService.error(res, 'Failed to retrieve performance alerts', 500);
    }
  });
  
  /**
   * Get all performance alerts for user
   * GET /api/performance/alerts
   */
  getAllPerformanceAlerts = this.asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    try {
      console.log(`🚨 Getting all performance alerts for user ${userId}`);
      
      const alertsData = await this.performanceService.getPerformanceAlerts(userId);
      
      return ResponseService.success(res, 'All performance alerts retrieved successfully', alertsData);
      
    } catch (error) {
      console.error('All performance alerts error:', error);
      return ResponseService.error(res, 'Failed to retrieve performance alerts', 500);
    }
  });
  
  /**
   * Mark performance alert as read
   * PATCH /api/performance/alerts/:alertId/read
   */
  markAlertAsRead = this.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const userId = req.user._id;
    
    try {
      console.log(`📖 Marking alert ${alertId} as read for user ${userId}`);
      
      const updatedAlert = await this.performanceService.markAlertAsRead(alertId, userId);
      
      return ResponseService.success(res, 'Alert marked as read successfully', {
        alertId: updatedAlert._id,
        isRead: updatedAlert.isRead,
        readAt: updatedAlert.updatedAt
      });
      
    } catch (error) {
      console.error('Mark alert as read error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, 'Alert not found');
      }
      
      if (error.message.includes('Access denied')) {
        return ResponseService.forbidden(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to mark alert as read', 500);
    }
  });
  
  /**
   * Resolve performance alert
   * PATCH /api/performance/alerts/:alertId/resolve
   */
  resolveAlert = this.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { notes = '' } = req.body;
    const userId = req.user._id;
    
    try {
      console.log(`✅ Resolving alert ${alertId} for user ${userId}`);
      
      const resolvedAlert = await this.performanceService.resolveAlert(alertId, userId, notes);
      
      return ResponseService.success(res, 'Alert resolved successfully', {
        alertId: resolvedAlert._id,
        isResolved: resolvedAlert.isResolved,
        resolvedAt: resolvedAlert.resolvedAt,
        resolvedBy: resolvedAlert.resolvedBy,
        resolutionNotes: resolvedAlert.resolutionNotes
      });
      
    } catch (error) {
      console.error('Resolve alert error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, 'Alert not found');
      }
      
      if (error.message.includes('Access denied')) {
        return ResponseService.forbidden(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to resolve alert', 500);
    }
  });
  
  /**
   * Get performance statistics and summary
   * GET /api/performance/:ideaId/stats
   */
  getPerformanceStats = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const { timeRange = '30d' } = req.query;
    
    try {
      console.log(`📊 Getting performance stats for idea ${ideaId}`);
      
      // Get latest performance data
      const performanceData = await this.performanceService.getPerformanceDashboard(
        ideaId, 
        timeRange, 
        true, 
        false
      );
      
      // Calculate summary statistics
      const stats = this.calculatePerformanceStats(performanceData);
      
      return ResponseService.success(res, 'Performance statistics retrieved successfully', stats);
      
    } catch (error) {
      console.error('Performance stats error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to retrieve performance statistics', 500);
    }
  });
  
  /**
   * Export performance data
   * GET /api/performance/:ideaId/export
   */
  exportPerformanceData = this.asyncHandler(async (req, res) => {
    const { ideaId } = req.params;
    const { 
      format = 'json', 
      timeRange = '30d',
      includeHistory = 'false' 
    } = req.query;
    
    try {
      console.log(`📤 Exporting performance data for idea ${ideaId} in ${format} format`);
      
      // Validate format
      if (!['json', 'csv'].includes(format.toLowerCase())) {
        return ResponseService.badRequest(res, 'Invalid export format. Supported formats: json, csv');
      }
      
      // Get performance data
      const performanceData = await this.performanceService.getPerformanceDashboard(
        ideaId, 
        timeRange, 
        true, 
        true
      );
      
      // Include history if requested
      if (includeHistory === 'true') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));
        
        const historyData = await this.performanceService.getPerformanceHistory(
          ideaId,
          startDate.toISOString(),
          endDate.toISOString(),
          'daily'
        );
        
        performanceData.history = historyData;
      }
      
      // Format data based on requested format
      if (format.toLowerCase() === 'csv') {
        const csvData = this.formatPerformanceDataAsCSV(performanceData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="team-performance-${ideaId}-${timeRange}.csv"`);
        
        return res.send(csvData);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="team-performance-${ideaId}-${timeRange}.json"`);
        
        return res.json({
          success: true,
          exportedAt: new Date().toISOString(),
          timeRange,
          data: performanceData
        });
      }
      
    } catch (error) {
      console.error('Export performance data error:', error);
      
      if (error.message.includes('not found')) {
        return ResponseService.notFound(res, error.message);
      }
      
      return ResponseService.error(res, 'Failed to export performance data', 500);
    }
  });
  
  // Private helper methods
  
  /**
   * Calculate summary statistics from performance data
   * @param {Object} performanceData - Performance data
   * @returns {Object} Summary statistics
   */
  calculatePerformanceStats(performanceData) {
    const members = performanceData.members || [];
    
    if (members.length === 0) {
      return {
        teamSize: 0,
        averagePerformance: 0,
        topPerformer: null,
        performanceDistribution: {},
        keyMetrics: {}
      };
    }
    
    // Calculate averages
    const avgOverallScore = members.reduce((sum, m) => sum + m.performance.overall.score, 0) / members.length;
    const avgTaskScore = members.reduce((sum, m) => sum + m.performance.tasks.score, 0) / members.length;
    const avgCommScore = members.reduce((sum, m) => sum + m.performance.communication.score, 0) / members.length;
    const avgCollabScore = members.reduce((sum, m) => sum + m.performance.collaboration.score, 0) / members.length;
    const avgContribScore = members.reduce((sum, m) => sum + m.performance.contribution.score, 0) / members.length;
    
    // Find top performer
    const topPerformer = members.reduce((top, member) => 
      member.performance.overall.score > (top?.performance?.overall?.score || 0) ? member : top
    );
    
    // Calculate performance distribution
    const distribution = {
      excellent: members.filter(m => m.performance.overall.score >= 4.5).length, // A+, A
      good: members.filter(m => m.performance.overall.score >= 3.5 && m.performance.overall.score < 4.5).length, // A-, B+
      average: members.filter(m => m.performance.overall.score >= 2.5 && m.performance.overall.score < 3.5).length, // B, B-
      needsImprovement: members.filter(m => m.performance.overall.score < 2.5).length // C+, C, C-, D
    };
    
    return {
      teamSize: members.length,
      averagePerformance: {
        overall: Math.round(avgOverallScore * 100) / 100,
        tasks: Math.round(avgTaskScore * 100) / 100,
        communication: Math.round(avgCommScore * 100) / 100,
        collaboration: Math.round(avgCollabScore * 100) / 100,
        contribution: Math.round(avgContribScore * 100) / 100
      },
      topPerformer: topPerformer ? {
        name: topPerformer.user.fullName,
        score: topPerformer.performance.overall.score,
        grade: topPerformer.performance.overall.grade
      } : null,
      performanceDistribution: distribution,
      keyMetrics: {
        taskCompletionRate: performanceData.tasks?.completionRate || 0,
        teamProductivity: performanceData.overall?.productivity || 0,
        communicationActivity: performanceData.communication?.totalMessages || 0,
        collaborationScore: performanceData.overall?.collaboration || 0
      }
    };
  }
  
  /**
   * Format performance data as CSV
   * @param {Object} performanceData - Performance data
   * @returns {string} CSV formatted data
   */
  formatPerformanceDataAsCSV(performanceData) {
    const members = performanceData.members || [];
    
    // CSV headers
    const headers = [
      'Member Name',
      'Role',
      'Overall Score',
      'Overall Grade',
      'Task Score',
      'Task Completion Rate',
      'Communication Score',
      'Activity Level',
      'Collaboration Score',
      'Total Posts',
      'Contribution Score',
      'Total Files'
    ];
    
    // CSV rows
    const rows = members.map(member => [
      `"${member.user.fullName}"`,
      `"${member.user.role || 'Team Member'}"`,
      member.performance.overall.score,
      member.performance.overall.grade,
      member.performance.tasks.score,
      member.performance.tasks.completionRate,
      member.performance.communication.score,
      member.performance.communication.activityLevel,
      member.performance.collaboration.score,
      member.performance.collaboration.totalPosts,
      member.performance.contribution.score,
      member.performance.contribution.totalFiles
    ]);
    
    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    return csvContent;
  }
}

export default new PerformanceController();
