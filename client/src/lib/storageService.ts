// Supabase Storage service for file uploads
import { supabase } from './supabaseClient';

const PROFILE_IMAGES_BUCKET = 'profile-images';
const DOCUMENTS_BUCKET = 'documents';

/**
 * Upload profile image
 */
export async function uploadProfileImage(
  userId: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { url: null, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { url: null, error: 'File size too large. Maximum size is 5MB.' };
    }

    // Create file path: user-id/timestamp-filename (bucket name is already specified in .from())
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${timestamp}.${fileExt}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { url: null, error: error.message || 'Failed to upload image' };
  }
}

/**
 * Upload document (resume, portfolio, etc.)
 */
export async function uploadDocument(
  userId: string,
  file: File,
  documentType: 'resume' | 'portfolio' | 'other' = 'other'
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!validTypes.includes(file.type)) {
      return { url: null, error: 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.' };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { url: null, error: 'File size too large. Maximum size is 10MB.' };
    }

    // Create file path: user-id/document-type-timestamp.ext (bucket name is already specified in .from())
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${documentType}-${timestamp}.${fileExt}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { url: null, error: error.message || 'Failed to upload document' };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete file' };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

