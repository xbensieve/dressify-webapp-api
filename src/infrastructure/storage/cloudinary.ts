import { v2 as cloudinary } from 'cloudinary';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';
import type { UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadOptions {
  folder?: string;
  maxFileSize?: number; // bytes
  allowedFormats?: string[];
  transformation?: object[];
}

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a file to Cloudinary with validation.
 */
export const uploadToCloudinary = async (
  filePath: string,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> => {
  const {
    folder = 'general',
    maxFileSize = MAX_FILE_SIZE,
    allowedFormats = ALLOWED_FORMATS,
  } = opts;

  // Validate file size via Cloudinary options
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    allowed_formats: allowedFormats,
    max_bytes: maxFileSize,
    resource_type: 'image',
    ...opts,
  });

  logger.debug({ public_id: result.public_id, folder }, 'File uploaded to Cloudinary');
  return result;
};

/**
 * Delete a file from Cloudinary by its public ID.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
  logger.debug({ public_id: publicId }, 'File deleted from Cloudinary');
};

export default cloudinary;
