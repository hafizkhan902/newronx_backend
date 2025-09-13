# 📊 Team Performance API Design & Implementation Guide

## 🎯 Overview

This document outlines the complete backend API design for team performance analytics in the StudentMate Squad application.

## 🏗️ Database Schema Design

### MongoDB Collections

#### **teamPerformance Collection**

```javascript
// Team Performance Aggregations
const teamPerformanceSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  ideaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    required: true,
    index: true
  },
  calculationDate: {
    type: Date,
    required: true,
    index: true
  },
  timeRange: {
    type: String,
    enum: ['7d', '30d', '90d', 'all'],
    default: '30d'
  },
  
  // Overall Metrics
  overall: {
    productivity: { type: Number, min: 0, max: 100 }, // 0-100%
    quality: { type: Number, min: 0, max: 5 }, // 0-5.0
    velocity: { type: Number, min: 0 }, // tasks per week
    collaboration: { type: Number, min: 0, max: 5 }, // 0-5.0
    avgResponseTimeMs: { type: Number, default: 0 }
  },
  
  // Task Metrics
  tasks: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },
    completionRate: { type: Number, min: 0, max: 100 }
  },
  
  // Communication Metrics
  communication: {
    totalMessages: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    avgResponseTime: { type: String }, // formatted duration
    avgEngagementRate: { type: Number, min: 0, max: 10 }
  },
  
  // Collaboration Metrics
  engagement: {
    totalPosts: { type: Number, default: 0 },
    totalFiles: { type: Number, default: 0 },
    avgEngagement: { type: Number, min: 0, max: 10 },
    knowledgeSharingScore: { type: Number, min: 0, max: 5 }
  },
  
  // Team Insights
  insights: [{
    type: { type: String, enum: ['success', 'warning', 'info'] },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ['tasks', 'communication', 'collaboration', 'overall'] }
  }],
  
  // Team Recommendations
  recommendations: [{
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    action: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['tasks', 'communication', 'collaboration', 'team'] }
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound indexes for efficient queries
teamPerformanceSchema.index({ ideaId: 1, calculationDate: -1 });
teamPerformanceSchema.index({ ideaId: 1, timeRange: 1, calculationDate: -1 });

const TeamPerformance = mongoose.model('TeamPerformance', teamPerformanceSchema);
```

#### **memberPerformance Collection**

```javascript
// Individual Member Performance
const memberPerformanceSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  teamPerformanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamPerformance',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Team membership ID
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Overall Performance
  overall: {
    score: { type: Number, min: 0, max: 5, required: true }, // 0-5.0
    grade: { 
      type: String, 
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'], 
      required: true 
    },
    trend: { 
      type: String, 
      enum: ['up', 'down', 'stable'], 
      default: 'stable' 
    }
  },
  
  // Task Performance (40% weight)
  tasks: {
    score: { type: Number, min: 0, max: 5 },
    completionRate: { type: Number, min: 0, max: 100 },
    onTimeRate: { type: Number, min: 0, max: 100 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    inProgressTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    avgCompletionTime: { type: String }, // formatted duration
    avgCompletionTimeMs: { type: Number, default: 0 },
    priorityPerformance: { type: Number, min: 0, max: 100 }
  },
  
  // Communication Performance (25% weight)
  communication: {
    score: { type: Number, min: 0, max: 5 },
    avgResponseTime: { type: String }, // formatted duration
    avgResponseTimeMs: { type: Number, default: 0 },
    messagesPerDay: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    activityLevel: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    avgMessageLength: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 }
  },
  
  // Collaboration Performance (20% weight)
  collaboration: {
    score: { type: Number, min: 0, max: 5 },
    totalPosts: { type: Number, default: 0 },
    avgLikesPerPost: { type: Number, default: 0 },
    avgCommentsPerPost: { type: Number, default: 0 },
    mentionCount: { type: Number, default: 0 },
    knowledgeSharing: { type: Number, default: 0 },
    engagementRate: { type: Number, min: 0, max: 10 }
  },
  
  // Contribution Performance (15% weight)
  contribution: {
    score: { type: Number, min: 0, max: 5 },
    totalFiles: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    avgDownloadsPerFile: { type: Number, default: 0 },
    documentFiles: { type: Number, default: 0 },
    codeFiles: { type: Number, default: 0 },
    designFiles: { type: Number, default: 0 },
    diversityScore: { type: Number, min: 0, max: 5 },
    contributionTypes: [{ type: String }] // ['documentation', 'code', 'design', 'communication']
  },
  
  // Individual Insights
  insights: [{
    type: { 
      type: String, 
      enum: ['success', 'warning', 'info'], 
      required: true 
    },
    message: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['tasks', 'communication', 'collaboration', 'contribution', 'overall'] 
    }
  }],
  
  // Individual Recommendations
  recommendations: [{
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    action: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['tasks', 'communication', 'collaboration', 'contribution'] 
    }
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound indexes for efficient queries
memberPerformanceSchema.index({ teamPerformanceId: 1, memberId: 1 });
memberPerformanceSchema.index({ userId: 1, createdAt: -1 });
memberPerformanceSchema.index({ teamPerformanceId: 1, 'overall.score': -1 });

const MemberPerformance = mongoose.model('MemberPerformance', memberPerformanceSchema);
```

#### **performanceHistory Collection**

```javascript
// Performance History for Trend Analysis
const performanceHistorySchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
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
  overallScore: { type: Number, min: 0, max: 5 },
  taskScore: { type: Number, min: 0, max: 5 },
  communicationScore: { type: Number, min: 0, max: 5 },
  collaborationScore: { type: Number, min: 0, max: 5 },
  contributionScore: { type: Number, min: 0, max: 5 },
  
  // Key Metrics Snapshot
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
    postsCreated: { type: Number, default: 0 },
    filesUploaded: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes
performanceHistorySchema.index({ ideaId: 1, userId: 1, date: -1 });
performanceHistorySchema.index({ ideaId: 1, date: -1 });

const PerformanceHistory = mongoose.model('PerformanceHistory', performanceHistorySchema);
```

#### **performanceAlerts Collection**

```javascript
// Performance Alerts and Notifications
const performanceAlertSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
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
    enum: ['performance_drop', 'deadline_risk', 'low_engagement', 'team_milestone'],
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
    currentScore: { type: Number }
  }],
  
  // Alert Status
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
});

// Indexes
performanceAlertSchema.index({ ideaId: 1, authorId: 1, isRead: 1 });
performanceAlertSchema.index({ createdAt: -1 });
performanceAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const PerformanceAlert = mongoose.model('PerformanceAlert', performanceAlertSchema);
```

## 🔌 API Endpoints

### 1. Get Team Performance Dashboard

```
GET /api/performance/:ideaId/dashboard
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters:**
- `timeRange` (optional): `7d`, `30d`, `90d`, `all` (default: `30d`)
- `includeMembers` (optional): `true`/`false` (default: `true`)
- `includeInsights` (optional): `true`/`false` (default: `true`)

**Response:**
```json
{
  "success": true,
  "message": "Team performance data retrieved successfully",
  "data": {
    "teamId": "68b310dec1769ad5a4a420f3",
    "calculationDate": "2025-09-11T10:30:00.000Z",
    "timeRange": "30d",
    
    "overall": {
      "productivity": 87,
      "quality": 4.2,
      "collaboration": 3.8,
      "velocity": 2.3
    },
    
    "tasks": {
      "total": 45,
      "completed": 38,
      "inProgress": 5,
      "overdue": 2,
      "completionRate": 84
    },
    
    "communication": {
      "avgResponseTime": "2.4h",
      "totalMessages": 342,
      "activeMembers": 6
    },
    
    "engagement": {
      "totalPosts": 28,
      "totalFiles": 15,
      "avgEngagement": 7.2
    },
    
    "members": [
      {
        "memberId": "68b3119cc1769ad5a4a4213b",
        "user": {
          "_id": "68a34e451745e1c2237f97c4",
          "fullName": "John Doe",
          "avatar": "https://...",
          "role": "Frontend Developer"
        },
        "performance": {
          "overall": {
            "score": 4.3,
            "grade": "A-",
            "trend": "up"
          },
          "tasks": {
            "score": 4.5,
            "completionRate": 92,
            "onTimeRate": 88,
            "totalTasks": 12,
            "completedTasks": 11,
            "avgCompletionTime": "2.3d"
          },
          "communication": {
            "score": 4.0,
            "avgResponseTime": "1.8h",
            "messagesPerDay": 3.2,
            "activityLevel": "high"
          },
          "collaboration": {
            "score": 4.2,
            "totalPosts": 8,
            "avgLikesPerPost": 2.3,
            "mentionCount": 12,
            "knowledgeSharing": 5
          },
          "contribution": {
            "score": 4.1,
            "totalFiles": 7,
            "totalDownloads": 23,
            "diversityScore": 3
          }
        },
        "insights": [
          {
            "type": "success",
            "message": "Excellent task completion rate"
          },
          {
            "type": "success", 
            "message": "Very responsive team member"
          }
        ],
        "recommendations": [
          {
            "priority": "low",
            "action": "Continue Current Pace",
            "description": "Maintain excellent performance standards"
          }
        ]
      }
    ],
    
    "teamInsights": [
      {
        "type": "success",
        "title": "Strong Team Performance",
        "message": "5 out of 7 members are high performers"
      }
    ],
    
    "teamRecommendations": [
      {
        "priority": "medium",
        "action": "Implement Mentoring Program", 
        "description": "Pair 2 struggling members with 5 high performers"
      }
    ]
  }
}
```

### 2. Get Individual Member Performance

```
GET /api/performance/:ideaId/members/:memberId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "member": { /* member details */ },
    "performance": { /* detailed performance metrics */ },
    "historicalData": [
      {
        "date": "2025-09-01",
        "overallScore": 4.1,
        "taskScore": 4.2,
        "communicationScore": 3.9
      }
    ],
    "insights": [ /* insights array */ ],
    "recommendations": [ /* recommendations array */ ]
  }
}
```

### 3. Trigger Performance Recalculation

```
POST /api/performance/:ideaId/recalculate
```

**Body:**
```json
{
  "force": true, // Optional: force recalculation even if recent data exists
  "timeRange": "30d" // Optional: specific time range to recalculate
}
```

**Response:**
```json
{
  "success": true,
  "message": "Performance recalculation triggered",
  "data": {
    "calculationId": "calc_123456",
    "estimatedCompletionTime": "2025-09-11T10:35:00.000Z"
  }
}
```

### 4. Get Performance History

```
GET /api/performance/:ideaId/history
```

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string  
- `granularity`: `daily`, `weekly`, `monthly`

## 🔧 Backend Implementation

### Performance Calculation Service

```javascript
// services/performanceService.js
class PerformanceService {
  
  async calculateTeamPerformance(ideaId, timeRange = '30d') {
    try {
      // 1. Fetch all required data
      const [tasks, messages, posts, files, team] = await Promise.all([
        this.getTasksData(ideaId, timeRange),
        this.getMessagesData(ideaId, timeRange), 
        this.getPostsData(ideaId, timeRange),
        this.getFilesData(ideaId, timeRange),
        this.getTeamData(ideaId)
      ]);
      
      // 2. Calculate performance metrics
      const performance = PerformanceCalculator.calculateTeamPerformance(
        team.members, tasks, messages, posts, files
      );
      
      // 3. Save to database
      await this.savePerformanceData(ideaId, performance);
      
      return performance;
      
    } catch (error) {
      console.error('Performance calculation failed:', error);
      throw error;
    }
  }
  
  async getTasksData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await Task.find({
      ideaId: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    }).populate('assignedUsers', 'fullName avatar email')
      .populate('creator', 'fullName avatar')
      .lean(); // Use lean() for better performance
  }
  
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
          'chatInfo.ideaId': new mongoose.Types.ObjectId(ideaId),
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderInfo',
          pipeline: [{ $project: { fullName: 1, avatar: 1, email: 1 } }]
        }
      },
      {
        $project: {
          content: 1,
          sender: { $arrayElemAt: ['$senderInfo', 0] },
          createdAt: 1,
          type: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    return messageData;
  }
  
  async getPostsData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await TeamPost.find({
      ideaId: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    }).populate('author', 'fullName avatar email')
      .populate('comments.author', 'fullName avatar email')
      .populate('likes', 'fullName')
      .lean();
  }
  
  async getFilesData(ideaId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    return await TeamFile.find({
      ideaId: new mongoose.Types.ObjectId(ideaId),
      createdAt: { $gte: dateFilter }
    }).populate('uploader', 'fullName avatar email')
      .lean();
  }
  
  async savePerformanceData(ideaId, performanceData) {
    try {
      // Save team performance
      const teamPerf = new TeamPerformance({
        ideaId: new mongoose.Types.ObjectId(ideaId),
        calculationDate: new Date(),
        timeRange: performanceData.timeRange || '30d',
        overall: performanceData.overall,
        tasks: performanceData.tasks,
        communication: performanceData.communication,
        engagement: performanceData.engagement,
        insights: performanceData.teamInsights || [],
        recommendations: performanceData.teamRecommendations || []
      });
      
      const savedTeamPerf = await teamPerf.save();
      
      // Save individual member performances
      const memberPerfPromises = (performanceData.members || []).map(async (memberData, index) => {
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
      
    } catch (error) {
      console.error('❌ Error saving performance data:', error);
      throw error;
    }
  }
  
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
  
  getDateFilter(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date('2020-01-01'); // All time
    }
  }
}
```

### Route Implementation

```javascript
// routes/performance.js
const express = require('express');
const router = express.Router();
const PerformanceService = require('../services/performanceService');
const authMiddleware = require('../middleware/auth');
const premiumMiddleware = require('../middleware/premium'); // Performance is premium feature

// GET /api/performance/:ideaId/dashboard
router.get('/:ideaId/dashboard', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { timeRange = '30d', includeMembers = 'true', includeInsights = 'true' } = req.query;
    
    // Verify user is the idea author
    const idea = await Idea.findById(new mongoose.Types.ObjectId(ideaId));
    if (!idea || idea.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Performance data is only available to idea authors.'
      });
    }
    
    const performanceData = await PerformanceService.calculateTeamPerformance(ideaId, timeRange);
    
    // Filter response based on query parameters
    const response = {
      teamId: ideaId,
      calculationDate: new Date(),
      timeRange,
      ...performanceData
    };
    
    if (includeMembers === 'false') {
      delete response.members;
    }
    
    if (includeInsights === 'false') {
      delete response.teamInsights;
      delete response.teamRecommendations;
    }
    
    res.json({
      success: true,
      message: 'Team performance data retrieved successfully',
      data: response
    });
    
  } catch (error) {
    console.error('Performance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance data'
    });
  }
});

// POST /api/performance/:ideaId/recalculate
router.post('/:ideaId/recalculate', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { force = false, timeRange = '30d' } = req.body;
    
    // Verify user is the idea author
    const idea = await Idea.findById(new mongoose.Types.ObjectId(ideaId));
    if (!idea || idea.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only idea authors can trigger performance recalculation.'
      });
    }
    
    // Check if recent calculation exists (unless forced)
    if (!force) {
      const recentCalculation = await TeamPerformance.findOne({
        ideaId: new mongoose.Types.ObjectId(ideaId),
        calculationDate: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
      });
      
      if (recentCalculation) {
        return res.status(429).json({
          success: false,
          message: 'Performance was calculated recently. Use force=true to override.'
        });
      }
    }
    
    // Trigger async calculation
    const calculationId = `calc_${Date.now()}`;
    
    // Run calculation in background
    PerformanceService.calculateTeamPerformance(ideaId, timeRange)
      .then(() => console.log(`Performance calculation completed: ${calculationId}`))
      .catch(err => console.error(`Performance calculation failed: ${calculationId}`, err));
    
    res.json({
      success: true,
      message: 'Performance recalculation triggered',
      data: {
        calculationId,
        estimatedCompletionTime: new Date(Date.now() + 30000) // 30 seconds
      }
    });
    
  } catch (error) {
    console.error('Performance recalculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger performance recalculation'
    });
  }
});

module.exports = router;
```

## 📊 Performance Calculation Formula

### **Overall Team Productivity Formula**

```
Team Productivity = (
  Task Completion Rate × 0.40 +
  Average Quality Score × 0.30 +
  Collaboration Level × 0.20 +
  Team Velocity × 0.10
) × 100

Where:
- Task Completion Rate = (Completed Tasks / Total Tasks) × 100
- Average Quality Score = Σ(Individual Quality Scores) / Team Size
- Collaboration Level = Σ(Individual Collaboration Scores) / Team Size  
- Team Velocity = Tasks Completed per Week
```

### **Individual Performance Formula**

```
Individual Score = (
  Task Performance × 0.40 +
  Communication Performance × 0.25 +
  Collaboration Performance × 0.20 +
  Contribution Performance × 0.15
)

Task Performance = (
  Completion Rate × 0.30 +
  On-Time Rate × 0.30 +
  Priority Performance × 0.20 +
  Overdue Penalty × 0.20
)

Communication Performance = (
  Response Time Score × 0.40 +
  Activity Level Score × 0.35 +
  Message Quality Score × 0.25
)

Collaboration Performance = (
  Engagement Rate × 0.30 +
  Helping Others (Mentions) × 0.25 +
  Knowledge Sharing × 0.25 +
  Team Posts Activity × 0.20
)

Contribution Performance = (
  File Contributions × 0.35 +
  File Usage (Downloads) × 0.25 +
  Contribution Diversity × 0.25 +
  Communication Contributions × 0.15
)
```

## 🎯 Key Performance Indicators (KPIs)

### **Team Level KPIs**
1. **Team Productivity** (0-100%): Overall team efficiency
2. **Average Quality Score** (0-5.0): Work quality across team
3. **Team Velocity** (tasks/week): Speed of task completion
4. **Communication Efficiency**: Response time and engagement
5. **Collaboration Index**: Cross-team interaction and knowledge sharing

### **Individual Level KPIs**
1. **Overall Performance Score** (0-5.0): Weighted average of all metrics
2. **Task Completion Rate** (0-100%): Percentage of tasks completed
3. **On-Time Delivery Rate** (0-100%): Percentage of tasks completed on time
4. **Response Time** (hours/minutes): Average time to respond to messages
5. **Collaboration Score** (0-5.0): Team interaction and knowledge sharing

### **Behavioral Metrics**
1. **Activity Level**: Low/Medium/High based on daily engagement
2. **Knowledge Sharing**: Files uploaded and helpful posts created
3. **Team Support**: How often member helps others (mentions, comments)
4. **Consistency**: Performance stability over time

## 🔐 Security & Access Control

### **Access Restrictions**
- **Author Only**: Performance data is only accessible to idea authors
- **Premium Feature**: Requires premium subscription
- **Rate Limited**: Maximum 10 requests per hour per user
- **Data Privacy**: Individual performance data is never shared with other team members

### **Data Retention**
- **Performance Snapshots**: Kept for 12 months
- **Detailed Metrics**: Aggregated weekly, detailed data kept for 3 months
- **Historical Trends**: Monthly summaries kept indefinitely

## 🚀 Implementation Priority

### **Phase 1: Core Metrics (MVP)**
1. Task completion tracking
2. Basic communication metrics
3. Simple team productivity score

### **Phase 2: Advanced Analytics**
1. Individual performance scoring
2. Trend analysis
3. Insights generation

### **Phase 3: AI-Powered Insights**
1. Predictive performance analytics
2. Automated recommendations
3. Performance optimization suggestions

## 📈 Performance Optimization

### **Caching Strategy**
- Cache performance data for 5 minutes
- Background recalculation every hour
- Invalidate cache on major team changes

### **Database Optimization**
- Index on `(idea_id, calculation_date)`
- Aggregate historical data monthly
- Archive old detailed metrics

This comprehensive performance system provides deep insights into team dynamics and individual contributions, helping idea authors make informed decisions about team management and optimization.
