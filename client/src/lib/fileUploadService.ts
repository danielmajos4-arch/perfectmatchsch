/**
 * Enhanced File Upload Service
 * 
 * Provides file upload functionality with progress tracking,
 * validation, and error handling for resumes and portfolios
 */

import { supabase } from './supabaseClient';

export type FileType = 'resume' | 'portfolio' | 'profile-image' | 'other';
export type UploadProgress = (progress: number) => void;

export interface UploadResult {
  url: string | null;
  error: string | null;
  path: string | null;
}

export interface FileValidation {
  isValid: boolean;
  error?: string;
}

const BUCKETS = {
  'profile-image': 'profile-images',
  'resume': 'documents',
  'portfolio': 'documents',
  'other': 'documents',
} as const;

const VALID_TYPES = {
  'profile-image': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  'resume': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  'portfolio': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ],
  'other': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

const MAX_SIZES = {
  'profile-image': 5 * 1024 * 1024, // 5MB
  'resume': 10 * 1024 * 1024, // 10MB
  'portfolio': 20 * 1024 * 1024, // 20MB
  'other': 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  fileType: FileType
): FileValidation {
  // Check file type
  const validTypes = VALID_TYPES[fileType];
  if (!validTypes.includes(file.type)) {
    const allowedExtensions = validTypes
      .map(type => {
        if (type.includes('pdf')) return 'PDF';
        if (type.includes('word')) return 'DOC/DOCX';
        if (type.includes('text')) return 'TXT';
        if (type.includes('image')) return 'JPG/PNG/WEBP';
        return '';
      })
      .filter(Boolean)
      .join(', ');
    
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions}`,
    };
  }

  // Check file size
  const maxSize = MAX_SIZES[fileType];
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${maxSizeMB}MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile(
  userId: string,
  file: File,
  fileType: FileType,
  onProgress?: UploadProgress
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.isValid) {
      return {
        url: null,
        error: validation.error || 'File validation failed',
        path: null,
      };
    }

    // Determine bucket
    const bucket = BUCKETS[fileType];

    // Create file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50); // Limit filename length
    const filePath = `${userId}/${fileType}-${timestamp}-${sanitizedFileName}`;

    // Simulate progress (Supabase doesn't provide real progress, so we simulate)
    if (onProgress) {
      onProgress(10); // Start
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (onProgress) {
      onProgress(50); // Midway
    }

    if (error) {
      console.error('Upload error:', error);
      return {
        url: null,
        error: error.message || 'Failed to upload file',
        path: null,
      };
    }

    if (onProgress) {
      onProgress(90); // Almost done
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (onProgress) {
      onProgress(100); // Complete
    }

    return {
      url: urlData.publicUrl,
      error: null,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      url: null,
      error: error.message || 'Failed to upload file',
      path: null,
    };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { success: false, error: error.message || 'Failed to delete file' };
  }
}

/**
 * Get file URL from path
 */
export function getFileUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.type.includes('word') ||
    file.type === 'text/plain'
  );
}

