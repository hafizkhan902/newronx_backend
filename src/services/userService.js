import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class UserService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: 'dysr0wotl',
      api_key: '556186415216556',
      api_secret: 'vFobJ4jaGdWeYmFZtsTwwBI-MpU'
    });
  }

  // Helper method to get user from token
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.userId).select('+password');
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Get user profile by token
  async getProfileByToken(token) {
    // Always read fresh from DB with proper projection to avoid stale/cached data
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const fresh = await User.findById(decoded.userId)
        .select('-password -__v')
        .lean();
      if (!fresh) {
        throw new Error('User not found');
      }
      return fresh;
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }

  // Get user profile by ID
  async getProfileById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -__v')
        .lean();
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (err) {
      throw new Error('User not found');
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    console.log('[UserService] updateProfile called with data:', JSON.stringify(updateData, null, 2));
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Normalize legacy field names
    const normalized = { ...updateData };
    console.log('[UserService] Starting normalization...');
    
    if (normalized.name && !normalized.fullName) normalized.fullName = normalized.name;
    if (typeof normalized.skills === 'string') {
      try { const arr = JSON.parse(normalized.skills); if (Array.isArray(arr)) normalized.skills = arr; else normalized.skills = normalized.skills.split(','); }
      catch { normalized.skills = normalized.skills.split(','); }
      normalized.skills = normalized.skills.map(s => (typeof s === 'string' ? s.trim() : s)).filter(Boolean);
    }
    if (typeof normalized.lastName === 'string') {
      normalized.lastName = normalized.lastName.trim();
    }
    if (typeof normalized.interestedRoles === 'string') {
      try { const arr = JSON.parse(normalized.interestedRoles); if (Array.isArray(arr)) normalized.interestedRoles = arr; else normalized.interestedRoles = normalized.interestedRoles.split(','); }
      catch { normalized.interestedRoles = normalized.interestedRoles.split(','); }
      normalized.interestedRoles = normalized.interestedRoles.map(r => (typeof r === 'string' ? r.trim() : r)).filter(Boolean);
    }
    if (typeof normalized.education === 'string') {
      try { const arr = JSON.parse(normalized.education); if (Array.isArray(arr)) normalized.education = arr; else normalized.education = normalized.education.split(','); }
      catch { normalized.education = normalized.education.split(','); }
      normalized.education = normalized.education.map(e => (typeof e === 'string' ? e.trim() : e)).filter(Boolean);
    }

    // Normalize socialLinks: accept array of {type,value} OR object map { key: url } OR empty string to clear
    if (normalized.socialLinks !== undefined) {
      console.log('[UserService] Processing socialLinks:', JSON.stringify(normalized.socialLinks, null, 2));
      if (normalized.socialLinks === '' || normalized.socialLinks === null) {
        normalized.socialLinks = [];
        console.log('[UserService] socialLinks converted to empty array');
      } else if (!Array.isArray(normalized.socialLinks) && typeof normalized.socialLinks === 'object') {
        normalized.socialLinks = Object.entries(normalized.socialLinks)
          .filter(([, v]) => !!v)
          .map(([k, v]) => ({ type: k, value: v }));
        console.log('[UserService] socialLinks converted to array format:', JSON.stringify(normalized.socialLinks, null, 2));
      }
    }

    // Handle resume field - allow clearing
    if (normalized.resume !== undefined) {
      console.log('[UserService] Processing resume:', normalized.resume);
      if (normalized.resume === '' || normalized.resume === null) {
        normalized.resume = undefined; // Remove resume
        console.log('[UserService] resume converted to undefined');
      }
    }

    // Handle interestedRoles - allow clearing
    if (normalized.interestedRoles !== undefined) {
      console.log('[UserService] Processing interestedRoles:', JSON.stringify(normalized.interestedRoles, null, 2));
      if (normalized.interestedRoles === '' || normalized.interestedRoles === null) {
        normalized.interestedRoles = [];
        console.log('[UserService] interestedRoles converted to empty array');
      }
    }

    console.log('[UserService] Final normalized data:', JSON.stringify(normalized, null, 2));

    // Only update allowed fields (as per frontend spec)
    const allowedFields = [
      'firstName',
      'lastName',
      'fullName',
      'phone',
      'avatar',
      'bio',
      'address',
      'city',
      'state',
      'country',
      'zipCode',
      'skills',
      'education',
      'company',
      'position',
      'experience',
      'status',
      'socialLinks',
      'interestedRoles',
      'resume'
    ];
    allowedFields.forEach(field => {
      if (normalized[field] !== undefined) {
        user[field] = normalized[field];
        console.log(`[UserService] Updated field ${field}:`, JSON.stringify(normalized[field], null, 2));
      }
    });

    console.log('[UserService] Saving user to database...');
    await user.save();
    console.log('[UserService] User saved successfully');
    
    // Return legacy-friendly object
    const obj = user.toObject({ getters: true, virtuals: false });
    delete obj.password;
    console.log('[UserService] Returning updated user data');
    return obj;
  }

  // Helper to resolve user from either JWT token or userId
  async getUserFromTokenOrId(tokenOrId) {
    if (!tokenOrId) return null;
    // If looks like a 24-char hex string, treat as userId
    const looksLikeId = typeof tokenOrId === 'string' && /^[0-9a-fA-F]{24}$/.test(tokenOrId);
    try {
      if (looksLikeId) {
        return await User.findById(tokenOrId);
      }
      const decoded = jwt.verify(tokenOrId, process.env.JWT_SECRET);
      return await User.findById(decoded.userId);
    } catch {
      return null;
    }
  }

  // Upload avatar to Cloudinary
  async uploadAvatar(tokenOrId, file) {
    const user = await this.getUserFromTokenOrId(tokenOrId);
    if (!user) {
      throw new Error('User not found');
    }

    const userId = user._id.toString();
    const filePath = file.path;

    try {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: 'avatars',
        public_id: `avatar_${userId}`,
        overwrite: true,
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }]
      });

      // Store only the Cloudinary URL
      user.avatar = uploadResult.secure_url;
      user.avatarType = undefined;
      await user.save();

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      return {
        message: 'Avatar updated successfully',
        avatar: uploadResult.secure_url,
        public_id: uploadResult.public_id
      };
    } catch (uploadError) {
      // Clean up temporary file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }
  }

  // Generate Cloudinary signature
  generateSignature(publicId, timestamp) {
    const str = `folder=avatars&public_id=${publicId}&timestamp=${timestamp}vFobJ4jaGdWeYmFZtsTwwBI-MpU`;
    return crypto.createHash('sha1').update(str).digest('hex');
  }

  // Get avatar
  async getAvatar(tokenOrId) {
    const user = await this.getUserFromTokenOrId(tokenOrId);
    if (!user || !user.avatar) {
      return null;
    }
    return user.avatar;
  }

  // Get public avatar
  async getPublicAvatar(userId) {
    const user = await User.findById(userId);
    if (!user || !user.avatar) {
      return null;
    }
    return user.avatar;
  }

  // Search users
  async searchUsers(token, query, limit) {
    const currentUser = await this.getUserFromToken(token);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // If no search query, return empty results
    if (!query || query.trim() === '') {
      return { users: [], count: 0 };
    }

    const searchTerm = query.trim();

    // Search users by firstName, fullName, or email (case-insensitive)
    const users = await User.find({
      _id: { $ne: currentUser._id }, // Exclude current user
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('_id firstName fullName avatar email status')
      .limit(parseInt(limit))
      .lean();

    return {
      users,
      count: users.length,
      query: searchTerm
    };
  }

  // Get public profile
  async getPublicProfile(userId) {
    const user = await User.findById(userId)
      .select('firstName fullName avatar bio address skills socialLinks interestedRoles status');
    
    if (!user) {
      return null;
    }
    return user;
  }

  // Update email
  async updateEmail(token, email, password) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!email || !password) {
      throw new Error('Email and current password are required.');
    }

    // Disallow password-based verification for accounts without a password (e.g., Google OAuth)
    if (!user.password) {
      throw new Error('This account has no password set (Google sign-in). Use Google login or set a password via account recovery.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect.');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new Error('Email already exists.');
    }

    // Update email
    user.email = email.toLowerCase();
    await user.save();

    return { email: user.email };
  }

  // Update password
  async updatePassword(token, currentPassword, newPassword) {
    console.log('[UserService] updatePassword called');
    console.log('[UserService] currentPassword length:', currentPassword ? currentPassword.length : 'undefined');
    console.log('[UserService] newPassword length:', newPassword ? newPassword.length : 'undefined');
    
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    console.log('[UserService] User found:', {
      id: user._id,
      email: user.email,
      authProvider: user.authProvider,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    // Disallow password change for accounts without a stored password (e.g., Google OAuth)
    if (!user.password) {
      console.log('[UserService] No password found for user, throwing error');
      throw new Error('This account has no password set (Google sign-in). Please use Google login.');
    }

    console.log('[UserService] Verifying current password...');
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect.');
    }

    console.log('[UserService] Current password verified, hashing new password...');
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();
    console.log('[UserService] Password updated successfully');
  }

  // Update password by userId (uses req.user from middleware)
  async updatePasswordByUserId(userId, currentPassword, newPassword) {
    console.log('[UserService] updatePasswordByUserId called', { userId, currentLen: currentPassword ? currentPassword.length : 'undefined', newLen: newPassword ? newPassword.length : 'undefined' });
    if (!userId) {
      throw new Error('User not found');
    }
    
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const user = await User.findById(userId).select('password authProvider email');
    console.log('[UserService] updatePasswordByUserId loaded user', { email: user && user.email, authProvider: user && user.authProvider, hasPassword: !!(user && user.password), passwordLen: user && user.password ? user.password.length : 0 });
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('This account has no password set (Google sign-in). Please use Google login.');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();
    console.log('[UserService] updatePasswordByUserId: password updated');
  }

  // Update roles
  async updateRoles(token, roleData) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { isInvestor, isMentor, company, position, experience } = roleData;

    // Normalize arrays (accept array, comma string or JSON string)
    let investmentFocus = roleData.investmentFocus;
    if (typeof investmentFocus === 'string') {
      try { const arr = JSON.parse(investmentFocus); investmentFocus = Array.isArray(arr) ? arr : investmentFocus.split(','); }
      catch { investmentFocus = investmentFocus.split(','); }
      investmentFocus = investmentFocus.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
    }
    let mentorshipAreas = roleData.mentorshipAreas;
    if (typeof mentorshipAreas === 'string') {
      try { const arr = JSON.parse(mentorshipAreas); mentorshipAreas = Array.isArray(arr) ? arr : mentorshipAreas.split(','); }
      catch { mentorshipAreas = mentorshipAreas.split(','); }
      mentorshipAreas = mentorshipAreas.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
    }

    // Update role flags
    if (typeof isInvestor === 'boolean') {
      user.isInvestor = isInvestor;
    }
    if (typeof isMentor === 'boolean') {
      user.isMentor = isMentor;
    }

    // Update additional profile fields
    if (company !== undefined) user.company = company;
    if (position !== undefined) user.position = position;
    if (experience !== undefined) user.experience = experience;
    if (investmentFocus !== undefined) user.investmentFocus = investmentFocus;
    if (mentorshipAreas !== undefined) user.mentorshipAreas = mentorshipAreas;

    await user.save();

    return {
      isInvestor: user.isInvestor,
      isMentor: user.isMentor,
      company: user.company,
      position: user.position,
      experience: user.experience,
      investmentFocus: user.investmentFocus,
      mentorshipAreas: user.mentorshipAreas
    };
  }

  // Get roles
  async getRoles(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      isInvestor: user.isInvestor,
      isMentor: user.isMentor,
      company: user.company,
      position: user.position,
      experience: user.experience,
      investmentFocus: user.investmentFocus,
      mentorshipAreas: user.mentorshipAreas
    };
  }

  // Get privacy settings
  async getPrivacy(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      privacy: user.privacy,
      nda: user.nda
    };
  }

  // Update privacy settings
  async updatePrivacy(token, privacyData) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { profileProtection, profileVisibility, allowMessages, showEmail, showPhone } = privacyData;

    // Update privacy settings
    if (typeof profileProtection === 'boolean') {
      user.privacy.profileProtection = profileProtection;
    }
    if (profileVisibility && ['public', 'connections', 'private'].includes(profileVisibility)) {
      user.privacy.profileVisibility = profileVisibility;
    }
    if (typeof allowMessages === 'boolean') {
      user.privacy.allowMessages = allowMessages;
    }
    if (typeof showEmail === 'boolean') {
      user.privacy.showEmail = showEmail;
    }
    if (typeof showPhone === 'boolean') {
      user.privacy.showPhone = showPhone;
    }

    await user.save();

    return { privacy: user.privacy };
  }

  // Upload NDA
  async uploadNDA(token, file) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    // Check file type
    if (!file.mimetype.includes('pdf')) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error('Only PDF files are allowed.');
    }

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'ndas',
        public_id: `nda_${user._id}_${Date.now()}`,
        resource_type: 'raw'
      });

      // Clean up local file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Update user's NDA info
      user.nda.hasNDA = true;
      user.nda.ndaType = 'uploaded';
      user.nda.ndaFile = result.secure_url;
      user.nda.ideaProtection = true;

      await user.save();

      return {
        hasNDA: user.nda.hasNDA,
        ndaType: user.nda.ndaType,
        ndaFile: user.nda.ndaFile,
        ideaProtection: user.nda.ideaProtection
      };
    } catch (uploadError) {
      // Clean up local file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw uploadError;
    }
  }

  // Generate NDA
  async generateNDA(token, companyName, projectName, protectionScope) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!companyName || !projectName) {
      throw new Error('Company name and project name are required.');
    }

    // Generate NDA content
    const ndaContent = this.generateNDAContent(user, companyName, projectName, protectionScope);

    // Update user's NDA info
    user.nda.hasNDA = true;
    user.nda.ndaType = 'generated';
    user.nda.ndaGeneratedContent = ndaContent;
    user.nda.ndaGeneratedAt = new Date();
    user.nda.ideaProtection = true;

    await user.save();

    return {
      hasNDA: user.nda.hasNDA,
      ndaType: user.nda.ndaType,
      ndaGeneratedContent: user.nda.ndaGeneratedContent,
      ndaGeneratedAt: user.nda.ndaGeneratedAt,
      ideaProtection: user.nda.ideaProtection
    };
  }

  // Generate NDA content
  generateNDAContent(user, companyName, projectName, protectionScope) {
    const currentDate = new Date().toLocaleDateString();
    const protectionScopeText = protectionScope || 'all confidential information, trade secrets, and proprietary data';

    return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement (the "Agreement") is entered into as of ${currentDate} by and between:

${companyName} (the "Disclosing Party")
and
${user.fullName} (the "Receiving Party")

1. CONFIDENTIAL INFORMATION
The Receiving Party acknowledges that they may receive confidential information from the Disclosing Party related to ${projectName}, including but not limited to: ${protectionScopeText}.

2. NON-DISCLOSURE
The Receiving Party agrees to:
- Keep all confidential information strictly confidential
- Not disclose, reproduce, or use confidential information for any purpose other than the intended collaboration
- Take reasonable precautions to protect confidential information

3. TERM
This Agreement shall remain in effect for a period of 2 years from the date of disclosure.

4. RETURN OF MATERIALS
Upon request, the Receiving Party shall return or destroy all confidential information.

5. GOVERNING LAW
This Agreement shall be governed by applicable laws.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

${companyName}
By: _________________________
Date: ${currentDate}

${user.fullName}
By: _________________________
Date: ${currentDate}`;
  }

  // Remove NDA
  async removeNDA(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    // Reset NDA settings
    user.nda.hasNDA = false;
    user.nda.ndaType = 'none';
    user.nda.ndaFile = '';
    user.nda.ndaGeneratedContent = '';
    user.nda.ndaGeneratedAt = null;
    user.nda.ideaProtection = false;

    await user.save();

    return user.nda;
  }

  // Get notification settings
  async getNotifications(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return { notifications: user.notifications };
  }

  // Update email notifications
  async updateEmailNotifications(token, notificationData) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { enabled, preferences } = notificationData;

    // Update email notification enabled status
    if (typeof enabled === 'boolean') {
      user.notifications.email.enabled = enabled;
    }

    // Update email notification preferences
    if (preferences) {
      Object.keys(preferences).forEach(key => {
        if (typeof preferences[key] === 'boolean' && user.notifications.email.preferences.hasOwnProperty(key)) {
          user.notifications.email.preferences[key] = preferences[key];
        }
      });
    }

    await user.save();

    return { email: user.notifications.email };
  }

  // Update app notifications
  async updateAppNotifications(token, notificationData) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { enabled, browserPermission, preferences } = notificationData;

    // Update app notification enabled status
    if (typeof enabled === 'boolean') {
      user.notifications.app.enabled = enabled;
    }

    // Update browser permission status
    if (browserPermission && ['granted', 'denied', 'default'].includes(browserPermission)) {
      user.notifications.app.browserPermission = browserPermission;
    }

    // Update app notification preferences
    if (preferences) {
      Object.keys(preferences).forEach(key => {
        if (typeof preferences[key] === 'boolean' && user.notifications.app.preferences.hasOwnProperty(key)) {
          user.notifications.app.preferences[key] = preferences[key];
        }
      });
    }

    await user.save();

    return { app: user.notifications.app };
  }

  // Request notification permission
  async requestNotificationPermission(token, permission) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!permission || !['granted', 'denied', 'default'].includes(permission)) {
      throw new Error('Valid permission status is required.');
    }

    // Update browser permission status
    user.notifications.app.browserPermission = permission;

    // If permission is granted, enable app notifications
    if (permission === 'granted') {
      user.notifications.app.enabled = true;
    } else {
      user.notifications.app.enabled = false;
    }

    await user.save();

    return {
      app: user.notifications.app,
      requiresAction: permission === 'default'
    };
  }

  // Send test notification
  async sendTestNotification(token, type) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!type || !['email', 'app'].includes(type)) {
      throw new Error('Valid notification type is required (email or app).');
    }

    let testResult = {};

    if (type === 'email' && user.notifications.email.enabled) {
      // Simulate email notification
      testResult.email = {
        sent: true,
        message: 'Test email notification sent successfully'
      };
    }

    if (type === 'app' && user.notifications.app.enabled && user.notifications.app.browserPermission === 'granted') {
      // Simulate push notification
      testResult.app = {
        sent: true,
        message: 'Test push notification sent successfully'
      };
    }

    return { result: testResult };
  }

  // Get theme settings
  async getTheme(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    return { theme: user.theme };
  }

  // Update theme settings
  async updateTheme(token, themeData) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    const { mode, accentColor, fontSize, reducedMotion } = themeData;

    // Update theme mode
    if (mode && ['light', 'dark', 'auto'].includes(mode)) {
      user.theme.mode = mode;
    }

    // Update accent color (validate hex color)
    if (accentColor && /^#[0-9A-F]{6}$/i.test(accentColor)) {
      user.theme.accentColor = accentColor;
    }

    // Update font size
    if (fontSize && ['small', 'medium', 'large'].includes(fontSize)) {
      user.theme.fontSize = fontSize;
    }

    // Update reduced motion preference
    if (typeof reducedMotion === 'boolean') {
      user.theme.reducedMotion = reducedMotion;
    }

    await user.save();

    return { theme: user.theme };
  }

  // Update theme mode
  async updateThemeMode(token, mode) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    if (!mode || !['light', 'dark', 'auto'].includes(mode)) {
      throw new Error('Valid theme mode is required (light, dark, or auto).');
    }

    user.theme.mode = mode;
    await user.save();

    return { theme: { mode: user.theme.mode } };
  }

  // Generate profile CSV
  async generateProfileCSV(token) {
    const user = await this.getUserFromToken(token);
    if (!user) {
      throw new Error('User not found');
    }

    // Import Idea model to fetch user's ideas
    const Idea = (await import('../models/idea.model.js')).default;
    const userIdeas = await Idea.find({ author: user._id })
      .select('title description category createdAt updatedAt')
      .lean();

    // Create CSV content
    return this.createProfileCSV(user, userIdeas);
  }

  // Create profile CSV content
  createProfileCSV(user, ideas) {
    const sections = [];

    // Section 1: Personal Information
    sections.push('PERSONAL INFORMATION');
    sections.push('Field,Value');
    sections.push(`First Name,${this.escapeCSV(user.firstName || '')}`);
    sections.push(`Full Name,${this.escapeCSV(user.fullName || '')}`);
    sections.push(`Email,${this.escapeCSV(user.email || '')}`);
    sections.push(`Phone,${this.escapeCSV(user.phone || '')}`);
    sections.push(`Bio,${this.escapeCSV(user.bio || '')}`);
    sections.push(`Address,${this.escapeCSV(user.address || '')}`);
    sections.push(`City,${this.escapeCSV(user.city || '')}`);
    sections.push(`State,${this.escapeCSV(user.state || '')}`);
    sections.push(`Country,${this.escapeCSV(user.country || '')}`);
    sections.push(`Zip Code,${this.escapeCSV(user.zipCode || '')}`);
    sections.push('');

    // Section 2: Professional Information
    sections.push('PROFESSIONAL INFORMATION');
    sections.push('Field,Value');
    sections.push(`Company,${this.escapeCSV(user.company || '')}`);
    sections.push(`Position,${this.escapeCSV(user.position || '')}`);
    sections.push(`Experience,${this.escapeCSV(user.experience || '')}`);
    sections.push(`Skills,${this.escapeCSV((user.skills || []).join('; '))}`);
    sections.push(`Education,${this.escapeCSV((user.education || []).join('; '))}`);
    sections.push(`Resume Link,${this.escapeCSV(user.resume || '')}`);
    sections.push(`Interested Roles,${this.escapeCSV((user.interestedRoles || []).join('; '))}`);
    sections.push(`Status,${this.escapeCSV(user.status || '')}`);
    sections.push('');

    // Section 3: Roles and Specializations
    sections.push('ROLES AND SPECIALIZATIONS');
    sections.push('Field,Value');
    sections.push(`Is Investor,${user.isInvestor ? 'Yes' : 'No'}`);
    sections.push(`Is Mentor,${user.isMentor ? 'Yes' : 'No'}`);
    sections.push(`Investment Focus,${this.escapeCSV((user.investmentFocus || []).join('; '))}`);
    sections.push(`Mentorship Areas,${this.escapeCSV((user.mentorshipAreas || []).join('; '))}`);
    sections.push('');

    // Section 4: Social Links
    if (user.socialLinks && user.socialLinks.length > 0) {
      sections.push('SOCIAL MEDIA LINKS');
      sections.push('Platform,URL');
      user.socialLinks.forEach(link => {
        sections.push(`${this.escapeCSV(link.type)},${this.escapeCSV(link.value)}`);
      });
      sections.push('');
    }

    // Section 5: Account Information
    sections.push('ACCOUNT INFORMATION');
    sections.push('Field,Value');
    sections.push(`Account Created,${new Date(user.createdAt).toLocaleDateString()}`);
    sections.push(`Last Updated,${new Date(user.updatedAt).toLocaleDateString()}`);
    sections.push(`Email Verified,${user.isEmailVerified ? 'Yes' : 'No'}`);
    sections.push(`Phone Verified,${user.isPhoneVerified ? 'Yes' : 'No'}`);
    sections.push('');

    // Section 6: Ideas and Posts
    if (ideas && ideas.length > 0) {
      sections.push('IDEAS AND POSTS');
      sections.push('Title,Description,Category,Created Date,Last Updated');
      ideas.forEach(idea => {
        sections.push(`${this.escapeCSV(idea.title)},${this.escapeCSV(idea.description)},${this.escapeCSV(idea.category || '')},${new Date(idea.createdAt).toLocaleDateString()},${new Date(idea.updatedAt).toLocaleDateString()}`);
      });
      sections.push('');
    }

    // Section 7: Statistics
    sections.push('ACCOUNT STATISTICS');
    sections.push('Metric,Value');
    sections.push(`Total Ideas,${ideas.length}`);
    const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    sections.push(`Account Age,${accountAge} days`);
    sections.push(`Social Media Accounts,${user.socialLinks ? user.socialLinks.length : 0}`);
    sections.push('');

    // Section 8: Export Information
    sections.push('EXPORT INFORMATION');
    sections.push('Field,Value');
    sections.push(`Exported On,${new Date().toLocaleDateString()}`);
    sections.push(`Export Time,${new Date().toLocaleTimeString()}`);
    sections.push(`Data Format,CSV`);
    sections.push(`Total Sections,8`);
    sections.push(`Note,Settings and preferences are excluded for privacy and security`);

    return sections.join('\n');
  }

  // Helper function to escape CSV values
  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}

export default UserService;
