export interface FileValidationConfig {
  maxSizeMB: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

export const FILE_CONFIGS: Record<string, FileValidationConfig> = {
  resume: {
    maxSizeMB: 5,
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
  profileImage: {
    maxSizeMB: 2,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  portfolio: {
    maxSizeMB: 10,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
  },
  schoolLogo: {
    maxSizeMB: 1,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, config: FileValidationConfig): ValidationResult {
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > config.maxSizeMB) {
    return {
      valid: false,
      error: `File size must be less than ${config.maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`,
    };
  }

  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${config.allowedExtensions.join(', ')}`,
    };
  }

  const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!config.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`,
    };
  }

  if (containsSuspiciousCharacters(file.name)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 100);
}

function containsSuspiciousCharacters(filename: string): boolean {
  const suspiciousPatterns = [
    /\.\.\//,
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

export function generateUniqueFilename(originalFilename: string, userId: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = sanitized.split('.').pop();
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));

  return `${userId}/${nameWithoutExt}-${timestamp}-${random}.${extension}`;
}

export async function validateImageDimensions(
  file: File,
  minWidth: number = 200,
  minHeight: number = 200,
  maxWidth: number = 4000,
  maxHeight: number = 4000
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          error: `Image must be at least ${minWidth}x${minHeight}px`,
        });
        return;
      }

      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image must not exceed ${maxWidth}x${maxHeight}px`,
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Invalid image file',
      });
    };

    img.src = url;
  });
}
