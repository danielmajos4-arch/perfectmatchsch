// Supabase Storage service for file uploads
import { supabase } from './supabaseClient';
import {
  validateFile,
  generateUniqueFilename,
  FILE_CONFIGS,
  validateImageDimensions,
} from './fileValidation';

const PROFILE_IMAGES_BUCKET = 'profile-images';
const DOCUMENTS_BUCKET = 'documents';
const SCHOOL_LOGOS_BUCKET = 'school-logos';

export async function uploadProfileImage(
  userId: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    const validation = validateFile(file, FILE_CONFIGS.profileImage);
    if (!validation.valid) {
      return { url: null, error: validation.error || 'Invalid file' };
    }

    const dimensionValidation = await validateImageDimensions(file);
    if (!dimensionValidation.valid) {
      return { url: null, error: dimensionValidation.error || 'Invalid image dimensions' };
    }

    const filename = generateUniqueFilename(file.name, userId);

    const { data, error } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    return { url: null, error: error.message || 'Failed to upload image' };
  }
}

export async function uploadDocument(
  userId: string,
  file: File,
  documentType: 'resume' | 'portfolio' | 'other' = 'other'
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    const config =
      documentType === 'resume'
        ? FILE_CONFIGS.resume
        : documentType === 'portfolio'
          ? FILE_CONFIGS.portfolio
          : FILE_CONFIGS.portfolio;

    const validation = validateFile(file, config);
    if (!validation.valid) {
      return { url: null, error: validation.error || 'Invalid file' };
    }

    const filename = generateUniqueFilename(file.name, userId);

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    return { url: null, error: error.message || 'Failed to upload document' };
  }
}

export async function uploadResume(userId: string, file: File) {
  return uploadDocument(userId, file, 'resume');
}

export async function uploadSchoolLogo(
  schoolId: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    const validation = validateFile(file, FILE_CONFIGS.schoolLogo);
    if (!validation.valid) {
      return { url: null, error: validation.error || 'Invalid file' };
    }

    const dimensionValidation = await validateImageDimensions(file, 100, 100, 1000, 1000);
    if (!dimensionValidation.valid) {
      return { url: null, error: dimensionValidation.error || 'Invalid image dimensions' };
    }

    const filename = generateUniqueFilename(file.name, schoolId);

    const { data, error } = await supabase.storage
      .from(SCHOOL_LOGOS_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(SCHOOL_LOGOS_BUCKET)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    return { url: null, error: error.message || 'Failed to upload school logo' };
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

