import dotenv from 'dotenv';
dotenv.config();
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Hardcoded Cloudinary config for testing
const CLOUDINARY_CONFIG = {
  cloud_name: 'dysr0wotl',
  api_key: '556186415216556',
  api_secret: 'vFobJ4jaGdWeYmFZtsTwwBI-MpU'
};

cloudinary.config(CLOUDINARY_CONFIG);

// Verify Cloudinary configuration
const config = cloudinary.config();
console.log('Cloudinary Config Loaded:', {
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  has_secret: !!config.api_secret
});

// Function to generate Cloudinary signature
const generateSignature = (publicId, timestamp) => {
  const str = `folder=avatars&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.api_secret}`;
  return crypto.createHash('sha1').update(str).digest('hex');
};

// Multer setup for avatar uploads (disk storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'avatars');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });

// POST /api/users/avatar - upload avatar to Cloudinary
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    console.log('Starting avatar upload process...');
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const userId = user._id.toString();
    console.log('Processing upload for user:', userId);
    const filePath = req.file.path;

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateSignature(userId, timestamp);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: 'avatars',
        public_id: userId,
        timestamp: timestamp,
        signature: signature,
        api_key: CLOUDINARY_CONFIG.api_key
      });

      console.log('Cloudinary upload result:', uploadResult);

      // Store only the Cloudinary URL
      user.avatar = uploadResult.secure_url;
      // Remove avatarType as it's not needed anymore
      user.avatarType = undefined;
      await user.save();

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      return res.json({
        message: 'Avatar updated successfully',
        avatar: uploadResult.secure_url,
        public_id: uploadResult.public_id
      });
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      
      // Clean up temporary file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(500).json({
        message: 'Failed to upload image',
        error: uploadError.message
      });
    }
  } catch (error) {
    console.error('General Error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/users/avatar - get avatar image as URL
router.get('/avatar', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.avatar) {
      return res.status(404).json({ message: 'Avatar not found.' });
    }
    res.json({ avatar: user.avatar });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

// GET /api/users/:id/avatar - get avatar image as URL
router.get('/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.avatar) {
      return res.status(404).json({ message: 'Avatar not found.' });
    }
    res.redirect(user.avatar);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/users/profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('Profile fetch failed: No token');
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('Profile fetch failed: User not found');
      return res.status(404).json({ message: 'User not found.' });
    }
    console.log('Profile data sent:', user);
    res.json(user);
  } catch (error) {
    console.log('Profile fetch failed: Invalid or expired token');
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

// PATCH /api/users/profile
router.patch('/profile', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('Profile update failed: No token');
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Profile update failed: User not found');
      return res.status(404).json({ message: 'User not found.' });
    }
    // Only update allowed fields
    const allowedFields = ['firstName', 'fullName', 'phone', 'bio', 'avatar', 'address', 'skills', 'socialLinks', 'interestedRoles', 'resume', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });
    await user.save();
    const updatedUser = user.toObject({ getters: true, virtuals: false });
    console.log('Profile updated data sent:', updatedUser);
    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (error) {
    console.log('Profile update failed: Invalid or expired token');
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

const handleAvatarUpload = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const { avatar } = req.body;
    if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid avatar data.' });
    }
    // Parse base64
    const matches = avatar.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ message: 'Invalid avatar format.' });
    const mime = matches[1];
    const base64Data = matches[2];
    user.avatar = {
      data: Buffer.from(base64Data, 'base64'),
      contentType: mime
    };
    await user.save();
    res.json({ message: 'Avatar updated.' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
router.patch('/avatar', handleAvatarUpload);
router.post('/avatar', handleAvatarUpload);

// GET /api/users/avatar
router.get('/avatar', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.avatar || !user.avatar.data) return res.status(204).end();
    res.set('Content-Type', user.avatar.contentType || 'image/png');
    res.send(user.avatar.data);
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

// GET /api/users/search - Search users for messaging
router.get('/search', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    
    const { q, limit = 10 } = req.query;
    
    // If no search query, return empty results
    if (!q || q.trim() === '') {
      return res.json({ users: [], count: 0 });
    }
    
    const searchTerm = q.trim();
    
    // Search users by firstName, fullName, or email (case-insensitive)
    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('_id firstName fullName avatar email status')
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      users,
      count: users.length,
      query: searchTerm
    });
  } catch (error) {
    console.error('User search error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
});

// GET /api/users/:id/public - Public profile view
router.get('/:id/public', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('firstName fullName avatar bio address skills socialLinks interestedRoles status');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile', error: error.message });
  }
});

// PATCH /api/users/profile/email - Update email
router.patch('/profile/email', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and current password are required.' });
    }
    
    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    
    // Update email
    user.email = email.toLowerCase();
    await user.save();
    
    res.json({ message: 'Email updated successfully.', email: user.email });
  } catch (error) {
    console.error('Update email error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating email', error: error.message });
  }
});

// PATCH /api/users/profile/password - Update password
router.patch('/profile/password', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }
    
    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
});

// PATCH /api/users/profile/roles - Update investor/mentor roles
router.patch('/profile/roles', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { isInvestor, isMentor, company, position, experience, investmentFocus, mentorshipAreas } = req.body;
    
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
    
    res.json({ 
      message: 'Roles updated successfully.',
      user: {
        isInvestor: user.isInvestor,
        isMentor: user.isMentor,
        company: user.company,
        position: user.position,
        experience: user.experience,
        investmentFocus: user.investmentFocus,
        mentorshipAreas: user.mentorshipAreas
      }
    });
  } catch (error) {
    console.error('Update roles error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating roles', error: error.message });
  }
});

// GET /api/users/profile/roles - Get current roles
router.get('/profile/roles', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('isInvestor isMentor company position experience investmentFocus mentorshipAreas');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({
      isInvestor: user.isInvestor,
      isMentor: user.isMentor,
      company: user.company,
      position: user.position,
      experience: user.experience,
      investmentFocus: user.investmentFocus,
      mentorshipAreas: user.mentorshipAreas
    });
  } catch (error) {
    console.error('Get roles error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error fetching roles', error: error.message });
  }
});

// GET /api/users/profile/privacy - Get privacy settings
router.get('/profile/privacy', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('privacy nda');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({
      privacy: user.privacy,
      nda: user.nda
    });
  } catch (error) {
    console.error('Get privacy error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error fetching privacy settings', error: error.message });
  }
});

// PATCH /api/users/profile/privacy - Update privacy settings
router.patch('/profile/privacy', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { profileProtection, profileVisibility, allowMessages, showEmail, showPhone } = req.body;
    
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
    
    res.json({ 
      message: 'Privacy settings updated successfully.',
      privacy: user.privacy
    });
  } catch (error) {
    console.error('Update privacy error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating privacy settings', error: error.message });
  }
});

// POST /api/users/profile/nda/upload - Upload NDA PDF
router.post('/profile/nda/upload', upload.single('ndaFile'), async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    
    // Check file type
    if (!req.file.mimetype.includes('pdf')) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Only PDF files are allowed.' });
    }
    
    // Upload to Cloudinary
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'ndas',
        public_id: `nda_${user._id}_${Date.now()}`,
        resource_type: 'raw'
      });
      
      // Clean up local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      // Update user's NDA info
      user.nda.hasNDA = true;
      user.nda.ndaType = 'uploaded';
      user.nda.ndaFile = result.secure_url;
      user.nda.ideaProtection = true;
      
      await user.save();
      
      res.json({
        message: 'NDA uploaded successfully.',
        nda: {
          hasNDA: user.nda.hasNDA,
          ndaType: user.nda.ndaType,
          ndaFile: user.nda.ndaFile,
          ideaProtection: user.nda.ideaProtection
        }
      });
    } catch (uploadError) {
      // Clean up local file on error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw uploadError;
    }
  } catch (error) {
    console.error('Upload NDA error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error uploading NDA', error: error.message });
  }
});

// POST /api/users/profile/nda/generate - Generate NDA
router.post('/profile/nda/generate', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { companyName, projectName, protectionScope } = req.body;
    
    if (!companyName || !projectName) {
      return res.status(400).json({ message: 'Company name and project name are required.' });
    }
    
    // Generate NDA content
    const ndaContent = generateNDAContent(user, companyName, projectName, protectionScope);
    
    // Update user's NDA info
    user.nda.hasNDA = true;
    user.nda.ndaType = 'generated';
    user.nda.ndaGeneratedContent = ndaContent;
    user.nda.ndaGeneratedAt = new Date();
    user.nda.ideaProtection = true;
    
    await user.save();
    
    res.json({
      message: 'NDA generated successfully.',
      nda: {
        hasNDA: user.nda.hasNDA,
        ndaType: user.nda.ndaType,
        ndaGeneratedContent: user.nda.ndaGeneratedContent,
        ndaGeneratedAt: user.nda.ndaGeneratedAt,
        ideaProtection: user.nda.ideaProtection
      }
    });
  } catch (error) {
    console.error('Generate NDA error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error generating NDA', error: error.message });
  }
});

// DELETE /api/users/profile/nda - Remove NDA
router.delete('/profile/nda', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Reset NDA settings
    user.nda.hasNDA = false;
    user.nda.ndaType = 'none';
    user.nda.ndaFile = '';
    user.nda.ndaGeneratedContent = '';
    user.nda.ndaGeneratedAt = null;
    user.nda.ideaProtection = false;
    
    await user.save();
    
    res.json({
      message: 'NDA removed successfully.',
      nda: user.nda
    });
  } catch (error) {
    console.error('Remove NDA error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error removing NDA', error: error.message });
  }
});

// Helper function to generate NDA content
const generateNDAContent = (user, companyName, projectName, protectionScope) => {
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
};

// GET /api/users/profile/notifications - Get notification settings
router.get('/profile/notifications', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('notifications');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({
      notifications: user.notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error fetching notification settings', error: error.message });
  }
});

// PATCH /api/users/profile/notifications/email - Update email notification settings
router.patch('/profile/notifications/email', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { enabled, preferences } = req.body;
    
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
    
    res.json({ 
      message: 'Email notification settings updated successfully.',
      email: user.notifications.email
    });
  } catch (error) {
    console.error('Update email notifications error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating email notification settings', error: error.message });
  }
});

// PATCH /api/users/profile/notifications/app - Update app notification settings
router.patch('/profile/notifications/app', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { enabled, browserPermission, preferences } = req.body;
    
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
    
    res.json({ 
      message: 'App notification settings updated successfully.',
      app: user.notifications.app
    });
  } catch (error) {
    console.error('Update app notifications error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating app notification settings', error: error.message });
  }
});

// POST /api/users/profile/notifications/app/request-permission - Request browser notification permission
router.post('/profile/notifications/app/request-permission', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { permission } = req.body;
    
    if (!permission || !['granted', 'denied', 'default'].includes(permission)) {
      return res.status(400).json({ message: 'Valid permission status is required.' });
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
    
    res.json({ 
      message: 'Browser notification permission updated successfully.',
      app: user.notifications.app,
      requiresAction: permission === 'default'
    });
  } catch (error) {
    console.error('Request notification permission error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating notification permission', error: error.message });
  }
});

// POST /api/users/profile/notifications/test - Send test notification
router.post('/profile/notifications/test', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { type } = req.body;
    
    if (!type || !['email', 'app'].includes(type)) {
      return res.status(400).json({ message: 'Valid notification type is required (email or app).' });
    }
    
    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // and push notification service (Firebase, OneSignal, etc.)
    
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
    
    res.json({ 
      message: 'Test notification sent successfully.',
      result: testResult
    });
  } catch (error) {
    console.error('Test notification error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error sending test notification', error: error.message });
  }
});

// GET /api/users/profile/theme - Get current theme settings
router.get('/profile/theme', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('theme');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.json({
      theme: user.theme
    });
  } catch (error) {
    console.error('Get theme error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error fetching theme settings', error: error.message });
  }
});

// PATCH /api/users/profile/theme - Update theme settings
router.patch('/profile/theme', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { mode, accentColor, fontSize, reducedMotion } = req.body;
    
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
    
    res.json({ 
      message: 'Theme settings updated successfully.',
      theme: user.theme
    });
  } catch (error) {
    console.error('Update theme error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating theme settings', error: error.message });
  }
});

// PATCH /api/users/profile/theme/mode - Update only theme mode
router.patch('/profile/theme/mode', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const { mode } = req.body;
    
    if (!mode || !['light', 'dark', 'auto'].includes(mode)) {
      return res.status(400).json({ message: 'Valid theme mode is required (light, dark, or auto).' });
    }
    
    user.theme.mode = mode;
    await user.save();
    
    res.json({ 
      message: 'Theme mode updated successfully.',
      theme: {
        mode: user.theme.mode
      }
    });
  } catch (error) {
    console.error('Update theme mode error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error updating theme mode', error: error.message });
  }
});

// GET /api/users/profile/download - Download all profile data
router.get('/profile/download', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Import Idea model to fetch user's ideas
    const Idea = (await import('../models/idea.model.js')).default;
    const userIdeas = await Idea.find({ author: user._id })
      .select('title description category createdAt updatedAt')
      .lean();
    
    // Create CSV content instead of JSON
    const csvContent = generateProfileCSV(user, userIdeas);
    
    // Set response headers for CSV file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="profile-data-${user.firstName}-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Send the CSV content
    res.send(csvContent);
    
  } catch (error) {
    console.error('Download profile data error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    res.status(500).json({ message: 'Error downloading profile data', error: error.message });
  }
});

// Helper function to generate CSV content
const generateProfileCSV = (user, ideas) => {
  const sections = [];
  
  // Section 1: Personal Information
  sections.push('PERSONAL INFORMATION');
  sections.push('Field,Value');
  sections.push(`First Name,${escapeCSV(user.firstName || '')}`);
  sections.push(`Full Name,${escapeCSV(user.fullName || '')}`);
  sections.push(`Email,${escapeCSV(user.email || '')}`);
  sections.push(`Phone,${escapeCSV(user.phone || '')}`);
  sections.push(`Bio,${escapeCSV(user.bio || '')}`);
  sections.push(`Address,${escapeCSV(user.address || '')}`);
  sections.push(`City,${escapeCSV(user.city || '')}`);
  sections.push(`State,${escapeCSV(user.state || '')}`);
  sections.push(`Country,${escapeCSV(user.country || '')}`);
  sections.push(`Zip Code,${escapeCSV(user.zipCode || '')}`);
  sections.push('');
  
  // Section 2: Professional Information
  sections.push('PROFESSIONAL INFORMATION');
  sections.push('Field,Value');
  sections.push(`Company,${escapeCSV(user.company || '')}`);
  sections.push(`Position,${escapeCSV(user.position || '')}`);
  sections.push(`Experience,${escapeCSV(user.experience || '')}`);
  sections.push(`Skills,${escapeCSV((user.skills || []).join('; '))}`);
  sections.push(`Education,${escapeCSV((user.education || []).join('; '))}`);
  sections.push(`Resume Link,${escapeCSV(user.resume || '')}`);
  sections.push(`Interested Roles,${escapeCSV((user.interestedRoles || []).join('; '))}`);
  sections.push(`Status,${escapeCSV(user.status || '')}`);
  sections.push('');
  
  // Section 3: Roles and Specializations
  sections.push('ROLES AND SPECIALIZATIONS');
  sections.push('Field,Value');
  sections.push(`Is Investor,${user.isInvestor ? 'Yes' : 'No'}`);
  sections.push(`Is Mentor,${user.isMentor ? 'Yes' : 'No'}`);
  sections.push(`Investment Focus,${escapeCSV((user.investmentFocus || []).join('; '))}`);
  sections.push(`Mentorship Areas,${escapeCSV((user.mentorshipAreas || []).join('; '))}`);
  sections.push('');
  
  // Section 4: Social Links
  if (user.socialLinks && user.socialLinks.length > 0) {
    sections.push('SOCIAL MEDIA LINKS');
    sections.push('Platform,URL');
    user.socialLinks.forEach(link => {
      sections.push(`${escapeCSV(link.type)},${escapeCSV(link.value)}`);
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
      sections.push(`${escapeCSV(idea.title)},${escapeCSV(idea.description)},${escapeCSV(idea.category || '')},${new Date(idea.createdAt).toLocaleDateString()},${new Date(idea.updatedAt).toLocaleDateString()}`);
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
};

// Helper function to escape CSV values
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export default router; 