# AI Role Analysis API Documentation

## Overview

The AI Role Analysis API provides intelligent role suggestions for startup ideas using Google's Gemini AI. When AI is unavailable, it falls back to smart keyword-based analysis.

## Base URL
```
http://localhost:2000/api/ai
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting
- **10 requests per 15 minutes** per IP/user combination
- Rate limiting applies to all AI endpoints except `/status`

---

## Endpoints

### 1. Analyze Roles for Idea

**POST** `/analyze-roles`

Analyzes a startup idea and suggests 3-5 team roles needed for success.

#### Request Body
```json
{
  "title": "AI-powered study app",
  "description": "An application that helps students manage their study schedules and track progress",
  "targetAudience": "University students",
  "problemStatement": "Students struggle to manage study time effectively",
  "uniqueValue": "Personalized AI-driven study recommendations",
  "neededRoles": "Developer, Designer" // Optional: existing roles
}
```

#### Request Fields
| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `title` | string | false* | 200 | Idea title |
| `description` | string | false* | 5000 | Detailed idea description |
| `targetAudience` | string | false | 500 | Target user group |
| `problemStatement` | string | false | 1000 | Problem being solved |
| `uniqueValue` | string | false | 1000 | Unique value proposition |
| `neededRoles` | string | false | 500 | Existing role requirements |

*At least `title` or `description` is required.

#### Success Response (200)
```json
{
  "success": true,
  "message": "Roles analyzed successfully with AI",
  "data": {
    "roles": [
      "Full Stack Developer",
      "UI/UX Designer", 
      "Data Scientist",
      "Product Manager",
      "Digital Marketing Specialist"
    ],
    "aiGenerated": true,
    "fallback": false,
    "processingTime": 1250,
    "metadata": {
      "rolesCount": 5,
      "analysisMethod": "ai"
    }
  },
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 200
}
```

#### Fallback Response (200)
```json
{
  "success": true,
  "message": "Roles generated with smart fallback logic",
  "data": {
    "roles": [
      "Project Manager",
      "Full Stack Developer",
      "UI/UX Designer",
      "Marketing Specialist"
    ],
    "aiGenerated": false,
    "fallback": true,
    "processingTime": 45,
    "metadata": {
      "rolesCount": 4,
      "analysisMethod": "fallback"
    }
  },
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 200
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Title or description is required for analysis",
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 400
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "message": "Too many AI analysis requests, please try again later. Limit: 10 requests per 15 minutes."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to analyze roles",
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 500
}
```

---

### 2. Get AI Service Status

**GET** `/status`

Returns the current status and configuration of the AI service.

#### Success Response (200)
```json
{
  "success": true,
  "message": "AI service status retrieved successfully",
  "data": {
    "enabled": true,
    "configured": true,
    "model": "gemini-pro",
    "maxTokens": 1000,
    "temperature": 0.7,
    "timeout": 30000
  },
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 200
}
```

---

### 3. Test AI Service

**POST** `/test`

Tests the AI service connectivity (Admin/Development only).

#### Success Response (200)
```json
{
  "success": true,
  "message": "AI service test completed successfully",
  "data": {
    "success": true,
    "message": "AI service is working correctly",
    "testResponse": "AI service working"
  },
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 200
}
```

#### Failure Response (503)
```json
{
  "success": false,
  "message": "AI service test failed",
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 503
}
```

---

### 4. Get Usage Statistics

**GET** `/usage`

Returns AI service usage statistics for the authenticated user.

#### Success Response (200)
```json
{
  "success": true,
  "message": "AI usage statistics retrieved successfully",
  "data": {
    "userRequests": 0,
    "totalRequests": 0,
    "rateLimit": {
      "windowMs": 900000,
      "maxRequests": 10
    },
    "features": {
      "roleAnalysis": true,
      "serviceTesting": true
    }
  },
  "timestamp": "2025-08-23T11:15:30.123Z",
  "statusCode": 200
}
```

---

## Example Usage

### JavaScript/Fetch Example
```javascript
// Analyze roles for an idea
const analyzeRoles = async (ideaData, token) => {
  try {
    const response = await fetch('/api/ai/analyze-roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ideaData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Suggested roles:', result.data.roles);
      console.log('AI Generated:', result.data.aiGenerated);
    } else {
      console.error('Error:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Request failed:', error);
  }
};

// Usage
const ideaData = {
  title: "Smart Fitness Tracker App",
  description: "An app that tracks workouts and provides personalized fitness recommendations",
  targetAudience: "Fitness enthusiasts and beginners",
  problemStatement: "People struggle to maintain consistent workout routines"
};

analyzeRoles(ideaData, 'your_jwt_token_here');
```

### cURL Example
```bash
curl -X POST http://localhost:2000/api/ai/analyze-roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Smart Home Automation System",
    "description": "IoT-based system for controlling home appliances remotely",
    "targetAudience": "Homeowners and tech enthusiasts",
    "problemStatement": "Managing multiple home devices is complex and inefficient"
  }'
```

---

## Environment Setup

To enable AI features, add these environment variables:

```bash
# Required
GOOGLE_GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional (defaults shown)
GOOGLE_AI_MODEL=gemini-pro
GOOGLE_AI_MAX_TOKENS=1000
GOOGLE_AI_TEMPERATURE=0.7
GOOGLE_AI_TIMEOUT=30000
```

### Getting a Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to your environment variables
5. Restart your server

---

## Error Handling

The API includes comprehensive error handling:

1. **Validation Errors**: Invalid input data (400)
2. **Authentication Errors**: Missing/invalid token (401)
3. **Rate Limiting**: Too many requests (429)
4. **AI Service Errors**: Automatic fallback to keyword-based analysis
5. **Server Errors**: Graceful error responses (500)

---

## Features

### Smart Fallback System
- When AI is unavailable, the system uses intelligent keyword-based analysis
- Analyzes idea content for technical, business, and design requirements
- Provides relevant role suggestions based on detected patterns

### Rate Limiting
- Protects against API abuse
- 10 requests per 15-minute window
- Separate tracking per user/IP combination

### Comprehensive Logging
- Request/response logging for debugging
- Performance metrics tracking
- Error monitoring and alerting

### Security
- JWT authentication required
- Input validation and sanitization
- Rate limiting and request size limits
- Environment variable protection

---

## Integration with Frontend

This API is designed to integrate with the existing "Analyze Role with AI" button in your frontend. Replace the hardcoded role analysis function with API calls to this endpoint.

Example integration:
```javascript
const analyzeRolesWithAI = async () => {
  setAiAnalyzing(true);
  
  try {
    const ideaContent = {
      title: form.title,
      description: form.description,
      targetAudience: form.targetAudience,
      problemStatement: form.problemStatement,
      uniqueValue: form.uniqueValue
    };
    
    const response = await fetch('/api/ai/analyze-roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(ideaContent)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setNeededRoles(data.data.roles.join(', '));
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
  } finally {
    setAiAnalyzing(false);
  }
};
```