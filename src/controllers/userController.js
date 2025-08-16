import BaseController from './baseController.js';
import UserService from '../services/userService.js';

class UserController extends BaseController {
  constructor() {
    super();
    this.userService = new UserService();
  }

  // Get user profile
  getProfile = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const user = await this.userService.getProfileByToken(token);
    if (!user) {
      return this.sendNotFound(res, 'User not found.');
    }

    this.sendSuccess(res, user, 'Profile retrieved successfully.');
  });

  // Update user profile
  updateProfile = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updateProfile(token, req.body);
    
    this.sendSuccess(res, result, 'Profile updated successfully.');
  });

  // Upload avatar
  uploadAvatar = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    if (!req.file) {
      return this.sendBadRequest(res, 'No file uploaded.');
    }

    const result = await this.userService.uploadAvatar(token, req.file);
    
    this.sendSuccess(res, result, 'Avatar updated successfully.');
  });

  // Get avatar
  getAvatar = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const avatar = await this.userService.getAvatar(token);
    if (!avatar) {
      return this.sendNotFound(res, 'Avatar not found.');
    }

    this.sendSuccess(res, { avatar }, 'Avatar retrieved successfully.');
  });

  // Get public avatar
  getPublicAvatar = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const avatar = await this.userService.getPublicAvatar(id);
    if (!avatar) {
      return this.sendNotFound(res, 'Avatar not found.');
    }

    res.redirect(avatar);
  });

  // Search users
  searchUsers = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { q, limit = 10 } = req.query;
    
    const result = await this.userService.searchUsers(token, q, limit);
    
    this.sendSuccess(res, result, 'Users searched successfully.');
  });

  // Get public profile
  getPublicProfile = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const profile = await this.userService.getPublicProfile(id);
    if (!profile) {
      return this.sendNotFound(res, 'User not found.');
    }

    this.sendSuccess(res, profile, 'Public profile retrieved successfully.');
  });

  // Update email
  updateEmail = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { email, password } = req.body;
    
    const result = await this.userService.updateEmail(token, email, password);
    
    this.sendSuccess(res, result, 'Email updated successfully.');
  });

  // Update password
  updatePassword = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { currentPassword, newPassword } = req.body;
    
    await this.userService.updatePassword(token, currentPassword, newPassword);
    
    this.sendSuccess(res, null, 'Password updated successfully.');
  });

  // Update roles
  updateRoles = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updateRoles(token, req.body);
    
    this.sendSuccess(res, result, 'Roles updated successfully.');
  });

  // Get roles
  getRoles = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const roles = await this.userService.getRoles(token);
    
    this.sendSuccess(res, roles, 'Roles retrieved successfully.');
  });

  // Get privacy settings
  getPrivacy = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const privacy = await this.userService.getPrivacy(token);
    
    this.sendSuccess(res, privacy, 'Privacy settings retrieved successfully.');
  });

  // Update privacy settings
  updatePrivacy = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updatePrivacy(token, req.body);
    
    this.sendSuccess(res, result, 'Privacy settings updated successfully.');
  });

  // Upload NDA
  uploadNDA = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    if (!req.file) {
      return this.sendBadRequest(res, 'No file uploaded.');
    }

    const result = await this.userService.uploadNDA(token, req.file);
    
    this.sendSuccess(res, result, 'NDA uploaded successfully.');
  });

  // Generate NDA
  generateNDA = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { companyName, projectName, protectionScope } = req.body;
    
    const result = await this.userService.generateNDA(token, companyName, projectName, protectionScope);
    
    this.sendSuccess(res, result, 'NDA generated successfully.');
  });

  // Remove NDA
  removeNDA = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.removeNDA(token);
    
    this.sendSuccess(res, result, 'NDA removed successfully.');
  });

  // Get notification settings
  getNotifications = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const notifications = await this.userService.getNotifications(token);
    
    this.sendSuccess(res, notifications, 'Notification settings retrieved successfully.');
  });

  // Update email notifications
  updateEmailNotifications = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updateEmailNotifications(token, req.body);
    
    this.sendSuccess(res, result, 'Email notification settings updated successfully.');
  });

  // Update app notifications
  updateAppNotifications = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updateAppNotifications(token, req.body);
    
    this.sendSuccess(res, result, 'App notification settings updated successfully.');
  });

  // Request notification permission
  requestNotificationPermission = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { permission } = req.body;
    
    const result = await this.userService.requestNotificationPermission(token, permission);
    
    this.sendSuccess(res, result, 'Browser notification permission updated successfully.');
  });

  // Send test notification
  sendTestNotification = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { type } = req.body;
    
    const result = await this.userService.sendTestNotification(token, type);
    
    this.sendSuccess(res, result, 'Test notification sent successfully.');
  });

  // Get theme settings
  getTheme = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const theme = await this.userService.getTheme(token);
    
    this.sendSuccess(res, theme, 'Theme settings retrieved successfully.');
  });

  // Update theme settings
  updateTheme = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const result = await this.userService.updateTheme(token, req.body);
    
    this.sendSuccess(res, result, 'Theme settings updated successfully.');
  });

  // Update theme mode
  updateThemeMode = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const { mode } = req.body;
    
    const result = await this.userService.updateThemeMode(token, mode);
    
    this.sendSuccess(res, result, 'Theme mode updated successfully.');
  });

  // Download profile data
  downloadProfile = this.asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return this.sendUnauthorized(res, 'No token, authorization denied.');
    }

    const csvContent = await this.userService.generateProfileCSV(token);
    
    // Set response headers for CSV file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="profile-data-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Send the CSV content
    res.send(csvContent);
  });
}

export default new UserController();
