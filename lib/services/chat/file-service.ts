/**
 * Chat File Service
 *
 * Handles file attachment operations for the AI Chat feature.
 * Manages file previews, encoding, and validation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import type { EncodedFile } from '@/lib/store/chat/types';

// =============================================================================
// Types
// =============================================================================

export interface FilePreview {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
}

export interface FileConstraints {
  maxSizeBytes: number;
  allowedTypes: string[];
  maxFiles: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// Default Constraints
// =============================================================================

export const DEFAULT_FILE_CONSTRAINTS: FileConstraints = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFiles: 5,
};

// =============================================================================
// File Service Interface
// =============================================================================

export interface FileService {
  /**
   * Create a preview for a file
   * Requirements: 7.1 - Display preview thumbnail before sending
   */
  createPreview(file: File): Promise<FilePreview>;

  /**
   * Encode a file for upload as base64 data URL
   * Requirements: 7.3 - Encode images as base64 data URLs
   */
  encodeForUpload(file: File): Promise<EncodedFile>;

  /**
   * Revoke a file preview URL to free memory
   * Requirements: 7.2 - Revoke object URL and clear preview
   */
  revokePreview(preview: FilePreview): void;

  /**
   * Validate a file against constraints
   * Requirements: 7.5 - Disable attachment interface for unsupported models
   */
  validateFile(file: File, constraints?: FileConstraints): ValidationResult;

  /**
   * Validate multiple files against constraints
   */
  validateFiles(files: File[], constraints?: FileConstraints): ValidationResult;

  /**
   * Check if a file type is an image
   */
  isImageFile(file: File): boolean;

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string;
}


// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique ID for a file
 */
function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Read a file as a data URL (base64)
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Check if a MIME type is an image type
 */
function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// =============================================================================
// File Service Implementation
// =============================================================================

export const fileService: FileService = {
  async createPreview(file) {
    // Requirements: 7.1 - Create preview thumbnail
    const id = generateFileId();
    
    // Create object URL for preview
    const previewUrl = URL.createObjectURL(file);

    return {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl,
    };
  },

  async encodeForUpload(file) {
    // Requirements: 7.3 - Encode as base64 data URL
    const id = generateFileId();
    const dataUrl = await readFileAsDataUrl(file);
    
    // Also create a preview URL for display
    const previewUrl = URL.createObjectURL(file);

    return {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      previewUrl,
    };
  },

  revokePreview(preview) {
    // Requirements: 7.2 - Revoke object URL to free memory
    if (preview.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl);
    }
  },

  validateFile(file, constraints = DEFAULT_FILE_CONSTRAINTS) {
    // Check file size
    if (file.size > constraints.maxSizeBytes) {
      return {
        valid: false,
        error: `File "${file.name}" exceeds maximum size of ${formatBytes(constraints.maxSizeBytes)}`,
      };
    }

    // Check file type
    if (constraints.allowedTypes.length > 0) {
      const isAllowed = constraints.allowedTypes.some(type => {
        // Support wildcard types like "image/*"
        if (type.endsWith('/*')) {
          const prefix = type.slice(0, -1);
          return file.type.startsWith(prefix);
        }
        return file.type === type;
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type "${file.type}" is not allowed. Allowed types: ${constraints.allowedTypes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  },

  validateFiles(files, constraints = DEFAULT_FILE_CONSTRAINTS) {
    // Check total file count
    if (files.length > constraints.maxFiles) {
      return {
        valid: false,
        error: `Too many files. Maximum allowed: ${constraints.maxFiles}`,
      };
    }

    // Validate each file
    for (const file of files) {
      const result = this.validateFile(file, constraints);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  },

  isImageFile(file) {
    return isImageMimeType(file.type);
  },

  formatFileSize(bytes) {
    return formatBytes(bytes);
  },
};

// =============================================================================
// Utility Functions for Components
// =============================================================================

/**
 * Create file constraints for a model that supports images
 */
export function createImageConstraints(maxFiles = 5): FileConstraints {
  return {
    ...DEFAULT_FILE_CONSTRAINTS,
    maxFiles,
  };
}

/**
 * Create empty constraints (no files allowed)
 * Requirements: 7.5 - Disable attachment interface for unsupported models
 */
export function createNoFileConstraints(): FileConstraints {
  return {
    maxSizeBytes: 0,
    allowedTypes: [],
    maxFiles: 0,
  };
}

/**
 * Batch revoke multiple preview URLs
 */
export function revokeAllPreviews(previews: FilePreview[]): void {
  for (const preview of previews) {
    fileService.revokePreview(preview);
  }
}

/**
 * Batch revoke encoded files
 */
export function revokeAllEncodedFiles(files: EncodedFile[]): void {
  for (const file of files) {
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  }
}

// Export helpers for testing
export { generateFileId, readFileAsDataUrl, isImageMimeType, formatBytes };
