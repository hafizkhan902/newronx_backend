import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, isFeatureEnabled } from '../config/index.js';
import { logger } from './loggerService.js';

class AIService {
  constructor() {
    this.isEnabled = isFeatureEnabled('googleAI');
    
    // Debug logging
    logger.info('AI Service Constructor Debug:', {
      apiKeyConfigured: !!config.googleAI.apiKey,
      apiKeyLength: config.googleAI.apiKey ? config.googleAI.apiKey.length : 0,
      featureEnabled: this.isEnabled,
      model: config.googleAI.model
    });
    
    if (this.isEnabled) {
      try {
        this.genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
        this.model = this.genAI.getGenerativeModel({ 
          model: config.googleAI.model,
          generationConfig: {
            maxOutputTokens: config.googleAI.maxTokens,
            temperature: config.googleAI.temperature,
          }
        });
        logger.info('Google AI service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Google AI service:', error);
        this.isEnabled = false;
      }
    } else {
      logger.warn('Google AI service disabled - API key not configured');
    }
  }

  /**
   * Analyze an idea and suggest required team roles
   * @param {Object} ideaData - The idea data containing title, description, etc.
   * @returns {Promise<Object>} - Analysis result with suggested roles
   */
  async analyzeRolesForIdea(ideaData) {
    const startTime = Date.now();
    
    try {
      const { title, description, targetAudience, problemStatement, uniqueValue, neededRoles } = ideaData;
      
      // If AI is disabled, use fallback logic
      if (!this.isEnabled) {
        logger.info('Using fallback role analysis - AI service disabled');
        const fallbackRoles = this.getFallbackRoles(ideaData);
        return {
          success: false,
          roles: fallbackRoles,
          fallback: true,
          message: 'AI service unavailable, using smart fallback logic'
        };
      }

      // Validate input
      if (!title && !description) {
        throw new Error('Title or description is required for AI analysis');
      }

      // Construct the prompt for Gemini
      const prompt = this.buildAnalysisPrompt({
        title: title || 'Not provided',
        description: description || 'Not provided',
        targetAudience: targetAudience || 'Not provided',
        problemStatement: problemStatement || 'Not provided',
        uniqueValue: uniqueValue || 'Not provided',
        existingRoles: neededRoles || 'None specified'
      });

      logger.info('Sending idea to AI for role analysis', {
        title: title?.substring(0, 50) + '...',
        hasDescription: !!description,
        promptLength: prompt.length
      });

      // Generate content with timeout
      const result = await Promise.race([
        this.model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI request timeout')), config.googleAI.timeout)
        )
      ]);

      const response = await result.response;
      const suggestedRoles = response.text().trim();

      // Clean up and validate the response
      const roles = this.parseRolesResponse(suggestedRoles);

      const processingTime = Date.now() - startTime;
      logger.info('AI role analysis completed successfully', {
        processingTime,
        rolesCount: roles.length,
        roles: roles.slice(0, 5) // Log first 3 roles for debugging
      });

      return {
        success: true,
        roles: roles,
        rawResponse: suggestedRoles,
        processingTime,
        message: 'Roles analyzed successfully with AI'
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('AI Role Analysis Error:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        processingTime,
        ideaTitle: ideaData.title?.substring(0, 50) + '...',
        apiKeyConfigured: !!config.googleAI.apiKey,
        serviceEnabled: this.isEnabled
      });
      
      // Fallback to smart logic if AI fails
      const fallbackRoles = this.getFallbackRoles(ideaData);
      
      return {
        success: false,
        roles: fallbackRoles,
        error: error.message,
        fallback: true,
        processingTime,
        message: 'AI analysis failed, using smart fallback logic'
      };
    }
  }

  /**
   * Build the analysis prompt for Google Gemini
   * @param {Object} ideaDetails - Structured idea details
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPrompt(ideaDetails) {
    return `As an expert startup advisor and team building consultant, analyze the following startup idea and suggest 3-5 specific roles needed for the team to succeed.

STARTUP IDEA ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 IDEA TITLE: ${ideaDetails.title}

📝 DESCRIPTION: ${ideaDetails.description}

🎯 TARGET AUDIENCE: ${ideaDetails.targetAudience}

❗ PROBLEM STATEMENT: ${ideaDetails.problemStatement}

💡 UNIQUE VALUE PROPOSITION: ${ideaDetails.uniqueValue}

👥 EXISTING ROLES (if any): ${ideaDetails.existingRoles}

ANALYSIS REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on this startup idea, analyze and suggest the most critical roles needed for success. Consider:

🔧 TECHNICAL REQUIREMENTS:
- Development needs (web, mobile, backend, etc.)
- Infrastructure and DevOps requirements
- Data handling and analytics needs

💼 BUSINESS REQUIREMENTS:
- Strategic planning and business development
- Financial management and fundraising
- Legal and compliance needs

📈 MARKETING & GROWTH:
- User acquisition and retention
- Brand building and content creation
- Partnership and sales development

🎨 DESIGN & USER EXPERIENCE:
- UI/UX design requirements
- Product design and research
- Visual branding needs

🏆 DOMAIN EXPERTISE:
- Industry-specific knowledge
- Specialized skills for the problem domain

RESPONSE FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a comma-separated list of role names. Requirements:
- 3-5 roles maximum
-Analyze the startup's stage and immediate needs
- Consider the startup's stage and immediate needs
- Avoid duplicate roles
- Use clear, concise role titles
- Prioritize most critical roles first
- Use professional, concise role titles
- Prioritize most critical roles first
- Consider the startup's stage and immediate needs
- Avoid generic terms, be specific to the idea's requirements

Example format: "Full Stack Developer, UI/UX Designer, Digital Marketing Specialist, Business Development Manager"

SUGGESTED ROLES:`;
  }

  /**
   * Parse and clean the AI response to extract roles
   * @param {string} rawResponse - Raw response from AI
   * @returns {Array<string>} - Clean array of role names
   */
  parseRolesResponse(rawResponse) {
    try {
      // Remove any extra text and get just the roles
      let rolesText = rawResponse;
      
      // Handle potential formatting variations
      if (rolesText.includes(':')) {
        rolesText = rolesText.split(':').pop().trim();
      }
      
      // Split by comma and clean up each role
      const roles = rolesText
        .split(',')
        .map(role => role.trim())
        .filter(role => role.length > 0 && role.length < 100) // Reasonable length check
        .slice(0, 5); // Limit to 5 roles max

      // Validate we have at least some roles
      if (roles.length === 0) {
        throw new Error('No valid roles found in AI response');
      }

      return roles;
    } catch (error) {
      logger.warn('Failed to parse AI response', { error: error.message });
      throw error; // Re-throw to trigger fallback in main method
    }
  }

  /**
   * Smart fallback logic when AI is unavailable
   * @param {Object} ideaData - The idea data
   * @returns {Array<string>} - Suggested roles based on content analysis
   */
  getFallbackRoles(ideaData) {
    // When AI is unavailable, return empty array to indicate no suggestions available
    // This prevents returning hardcoded roles and encourages users to try again later
    logger.info('AI service unavailable - no role suggestions provided');
    
    return [];
  }

  /**
   * Get service status and statistics
   * @returns {Object} - Service status information
   */
  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!config.googleAI.apiKey,
      model: config.googleAI.model,
      maxTokens: config.googleAI.maxTokens,
      temperature: config.googleAI.temperature,
      timeout: config.googleAI.timeout
    };
  }

  /**
   * Test AI service connectivity
   * @returns {Promise<Object>} - Test result
   */
  async testService() {
    if (!this.isEnabled) {
      return {
        success: false,
        message: 'AI service is disabled or not configured'
      };
    }

    try {
      const testPrompt = 'Respond with exactly these three words: "AI service working"';
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text().trim();
      
      return {
        success: true,
        message: 'AI service is working correctly',
        testResponse: text
      };
    } catch (error) {
      return {
        success: false,
        message: 'AI service test failed',
        error: error.message,
        details: {
          name: error.name,
          apiKeyConfigured: !!config.googleAI.apiKey,
          serviceEnabled: this.isEnabled
        }
      };
    }
  }
}

// Export singleton instance
export default new AIService();