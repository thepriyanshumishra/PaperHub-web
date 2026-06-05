import { logSystemEvent } from './auditLogger';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const UPLOAD_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB max raw image
  PDF: 15 * 1024 * 1024,        // 15MB max PDF
  ZIP: 25 * 1024 * 1024,        // 25MB max ZIP
  SESSION_MAX_IMAGES: 30,       // Max images per exam session
  QUESTION_MAX_IMAGES: 3,       // Max pages per question
};

/**
 * Validate a file buffer against its claimed type, extension, and max size.
 * Inspects header magic bytes to prevent masquerading.
 */
export function validateUpload(
  buffer: Buffer,
  filename: string,
  claimedMime: string,
  category: 'image' | 'pdf' | 'zip' | 'any'
): ValidationResult {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // 1. Basic Extension/MIME Checks
  const allowedExtensions: Record<string, string[]> = {
    image: ['png', 'jpg', 'jpeg'],
    pdf: ['pdf'],
    zip: ['zip'],
    any: ['png', 'jpg', 'jpeg', 'pdf', 'zip'],
  };

  const allowedMimes: Record<string, string[]> = {
    image: ['image/png', 'image/jpeg', 'image/jpg'],
    pdf: ['application/pdf'],
    zip: ['application/zip', 'application/x-zip-compressed'],
    any: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/zip', 'application/x-zip-compressed'],
  };

  if (!allowedExtensions[category].includes(extension)) {
    return { isValid: false, error: `Invalid file extension .${extension} for category ${category}` };
  }

  if (!allowedMimes[category].includes(claimedMime)) {
    return { isValid: false, error: `Invalid MIME type ${claimedMime} for category ${category}` };
  }

  // 2. Size limits
  let maxSize = UPLOAD_LIMITS.IMAGE;
  if (extension === 'pdf') maxSize = UPLOAD_LIMITS.PDF;
  if (extension === 'zip') maxSize = UPLOAD_LIMITS.ZIP;

  if (buffer.length > maxSize) {
    return { isValid: false, error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB` };
  }

  if (buffer.length < 4) {
    return { isValid: false, error: 'File is too small or empty' };
  }

  // 3. Hex signature magic bytes verification
  const hex = buffer.toString('hex', 0, 4).toUpperCase();

  // Executable check: MZ (4D5A) or ELF (7F454C46)
  if (hex.startsWith('4D5A')) {
    return { isValid: false, error: 'Executable files (MZ) are strictly forbidden' };
  }
  if (hex === '7F454C46') {
    return { isValid: false, error: 'Executable files (ELF) are strictly forbidden' };
  }

  if (extension === 'pdf') {
    // PDF magic number: %PDF (25504446)
    if (hex !== '25504446') {
      return { isValid: false, error: 'Malformed or corrupt PDF file signature' };
    }
  } else if (extension === 'zip') {
    // ZIP magic number: PK\x03\x04 (504B0304)
    if (hex !== '504B0304') {
      return { isValid: false, error: 'Malformed or corrupt ZIP file signature' };
    }
  } else if (extension === 'png') {
    // PNG magic number: \x89PNG (89504E47)
    if (hex !== '89504E47') {
      return { isValid: false, error: 'Malformed or corrupt PNG file signature' };
    }
  } else if (extension === 'jpg' || extension === 'jpeg') {
    // JPEG magic number: FFD8FF
    const jpegHex = buffer.toString('hex', 0, 3).toUpperCase();
    if (jpegHex !== 'FFD8FF') {
      return { isValid: false, error: 'Malformed or corrupt JPEG file signature' };
    }
  }

  return { isValid: true };
}
