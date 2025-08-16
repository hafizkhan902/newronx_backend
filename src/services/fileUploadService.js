import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export class FileUploadService {
  // Upload single file to Cloudinary
  static async uploadToCloudinary(file, folder = 'general', options = {}) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const uploadOptions = {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        ...options
      };

      // If it's an image, add image-specific transformations
      if (file.mimetype.startsWith('image/')) {
        uploadOptions.transformation.push(
          { width: 800, height: 800, crop: 'limit' }
        );
      }

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);

      // Clean up local file after upload
      await this.cleanupLocalFile(file.path);

      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        folder: result.folder
      };
    } catch (error) {
      // Clean up local file on error
      if (file && file.path) {
        await this.cleanupLocalFile(file.path);
      }
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Upload multiple files to Cloudinary
  static async uploadMultipleToCloudinary(files, folder = 'general', options = {}) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadPromises = files.map(file => 
        this.uploadToCloudinary(file, folder, options)
      );

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      throw new Error(`Multiple file upload failed: ${error.message}`);
    }
  }

  // Delete file from Cloudinary
  static async deleteFromCloudinary(publicId, resourceType = 'auto') {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      return {
        success: result.result === 'ok',
        publicId,
        result: result.result
      };
    } catch (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  // Delete multiple files from Cloudinary
  static async deleteMultipleFromCloudinary(publicIds, resourceType = 'auto') {
    try {
      if (!publicIds || publicIds.length === 0) {
        throw new Error('No public IDs provided');
      }

      const deletePromises = publicIds.map(publicId => 
        this.deleteFromCloudinary(publicId, resourceType)
      );

      const results = await Promise.all(deletePromises);
      return results;
    } catch (error) {
      throw new Error(`Multiple file deletion failed: ${error.message}`);
    }
  }

  // Update file in Cloudinary (delete old, upload new)
  static async updateFileInCloudinary(oldPublicId, newFile, folder = 'general', options = {}) {
    try {
      // Delete old file
      if (oldPublicId) {
        await this.deleteFromCloudinary(oldPublicId);
      }

      // Upload new file
      const newFileData = await this.uploadToCloudinary(newFile, folder, options);

      return newFileData;
    } catch (error) {
      throw new Error(`File update failed: ${error.message}`);
    }
  }

  // Get file info from Cloudinary
  static async getFileInfo(publicId, resourceType = 'auto') {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        folder: result.folder,
        createdAt: result.created_at,
        tags: result.tags || []
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  // Generate signed upload URL for direct uploads
  static generateSignedUploadUrl(folder = 'general', options = {}) {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        {
          timestamp,
          folder,
          ...options
        },
        process.env.CLOUDINARY_API_SECRET
      );

      return {
        url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder
      };
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  // Clean up local file
  static async cleanupLocalFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup local file:', error);
    }
  }

  // Validate file type
  static validateFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
    if (!file) return false;
    
    return allowedTypes.includes(file.mimetype);
  }

  // Validate file size
  static validateFileSize(file, maxSize = 5 * 1024 * 1024) { // 5MB default
    if (!file) return false;
    
    return file.size <= maxSize;
  }

  // Get file extension from mimetype
  static getFileExtension(mimetype) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };

    return extensions[mimetype] || 'bin';
  }

  // Generate unique filename
  static generateUniqueFilename(originalName, timestamp = Date.now()) {
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const uniqueId = Math.random().toString(36).substring(2, 15);
    
    return `${nameWithoutExt}-${timestamp}-${uniqueId}${extension}`;
  }

  // Process image transformations
  static async processImageTransformations(publicId, transformations = []) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const result = await cloudinary.url(publicId, {
        transformation: transformations
      });

      return result;
    } catch (error) {
      throw new Error(`Image transformation failed: ${error.message}`);
    }
  }

  // Create thumbnail
  static async createThumbnail(publicId, width = 150, height = 150) {
    try {
      const transformations = [
        { width, height, crop: 'fill' },
        { quality: 'auto:good' }
      ];

      return await this.processImageTransformations(publicId, transformations);
    } catch (error) {
      throw new Error(`Thumbnail creation failed: ${error.message}`);
    }
  }

  // Optimize image for web
  static async optimizeForWeb(publicId, quality = 'auto:good') {
    try {
      const transformations = [
        { quality },
        { fetch_format: 'auto' }
      ];

      return await this.processImageTransformations(publicId, transformations);
    } catch (error) {
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  // Get Cloudinary usage statistics
  static async getUsageStats() {
    try {
      const result = await cloudinary.api.usage();
      
      return {
        plan: result.plan,
        credits: result.credits,
        objects: result.objects,
        bandwidth: result.bandwidth,
        storage: result.storage,
        requests: result.requests,
        resources: result.resources,
        derivedResources: result.derived_resources
      };
    } catch (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }
}

// Export utility functions
export const uploadToCloudinary = FileUploadService.uploadToCloudinary.bind(FileUploadService);
export const deleteFromCloudinary = FileUploadService.deleteFromCloudinary.bind(FileUploadService);
export const generateSignedUploadUrl = FileUploadService.generateSignedUploadUrl.bind(FileUploadService);
