import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.config';
import { Request, Response, NextFunction } from 'express';

// Custom storage engine for Multer using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file) => {
    // Extract userId from request (assuming it's available in req.user)
    const userId = req.user?.userId; // Adjust based on your authentication setup

    if (!userId) {
      throw new Error('User ID is required for folder structure.');
    }

    // Define folder structure: SyncFlow/userId/
    const folder = `SyncFlow/${userId}`;

    return {
      folder: folder, // Folder structure in Cloudinary
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'], // Allowed file formats
      resource_type: 'auto', // Automatically detect resource type (image, video, raw)
      public_id: `${Date.now()}-${file.originalname}`, // Unique file name
    };
  },
});

// Multer middleware with file validation
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(
        new Error(
          'Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.',
        ),
      );
    }
  },
});

// Middleware to handle single image upload
export const uploadSingleImage = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      // Attach file information to the request object
      if (req.file) {
        (req as any).fileDetails = {
          url: (req.file as any).secure_url, // Cloudinary file URL
          publicId: (req.file as any).public_id, // Cloudinary public ID
          format: (req.file as any).format, // File format (e.g., jpg, png)
          bytes: (req.file as any).bytes, // File size in bytes
          width: (req.file as any).width, // Image width (if applicable)
          height: (req.file as any).height, // Image height (if applicable)
        };
      }

      next();
    });
  };
};

// Middleware to handle multiple file uploads
export const uploadMultipleFiles = (
  fieldName: string,
  maxCount: number = 5,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }

      // Attach file information to the request object
      if (req.files && Array.isArray(req.files)) {
        (req as any).fileDetails = (req.files as any[]).map((file) => ({
          url: file.secure_url, // Cloudinary file URL
          publicId: file.public_id, // Cloudinary public ID
          format: file.format, // File format (e.g., jpg, png)
          bytes: file.bytes, // File size in bytes
          width: file.width, // Image width (if applicable)
          height: file.height, // Image height (if applicable)
        }));
      }

      next();
    });
  };
};

// Error handling for file uploads
const handleUploadError = (err: any, res: Response) => {
  if (err instanceof multer.MulterError) {
    // Multer errors (e.g., file size limits)
    return res
      .status(400)
      .json({ message: 'File upload error', error: err.message });
  } else if (err.message === 'Invalid file type.') {
    // Custom file type validation error
    return res.status(400).json({ message: err.message });
  } else if (err.message === 'User ID is required for folder structure.') {
    // Missing userId error
    return res.status(400).json({ message: err.message });
  } else {
    // Generic server error
    return res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
};
