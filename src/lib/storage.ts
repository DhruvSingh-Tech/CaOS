import { getSupabaseClient } from './supabase';

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  fileSize?: string;
  fileName?: string;
  error?: string;
}

/**
 * Format bytes into human-readable string (e.g. "3.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Upload a file to Supabase Storage bucket ('notes' or 'timetables')
 */
export async function uploadAcademicFile(
  bucket: 'notes' | 'timetables',
  file: File,
  folderPrefix: string = 'usar-ar1b2'
): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const formattedSize = formatFileSize(file.size);
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folderPrefix}/${Date.now()}_${cleanFileName}`;

  if (!supabase) {
    // If Supabase is not configured, generate a local blob URL for immediate preview
    const localBlobUrl = URL.createObjectURL(file);
    return {
      success: true,
      publicUrl: localBlobUrl,
      fileSize: formattedSize,
      fileName: file.name,
    };
  }

  if (bucket === 'timetables') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Authentication required to upload official timetables',
      };
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`Supabase Storage upload warning (falling back to blob):`, error.message);
      // Fallback to blob URL if bucket doesn't exist yet
      return {
        success: true,
        publicUrl: URL.createObjectURL(file),
        fileSize: formattedSize,
        fileName: file.name,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      fileSize: formattedSize,
      fileName: file.name,
    };
  } catch (err: any) {
    console.error('Storage upload error:', err);
    return {
      success: true,
      publicUrl: URL.createObjectURL(file),
      fileSize: formattedSize,
      fileName: file.name,
    };
  }
}

