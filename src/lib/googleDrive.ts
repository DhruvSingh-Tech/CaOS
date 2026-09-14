/**
 * Google Drive Vault Client & Proxy Engine
 * Supports Supabase Edge Function proxy with in-memory caching and direct API fallback
 */

import { getSupabaseClient } from './supabase';

export const DEFAULT_ROOT_FOLDER_ID = '1tXX8-FI9xsCVBWtOoKpeAvtvU5AB6DGa';

export interface VaultItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  isFolder: boolean;
  size: string;
  sizeBytes?: number;
  modifiedTime?: string;
  url: string;
  downloadUrl?: string;
  previewUrl?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parentId?: string;
}

export interface VaultFolderResponse {
  folderId: string;
  folderName?: string;
  items: VaultItem[];
  error?: string;
  cached?: boolean;
}

// Client-side cache for instant back-navigation (5 min TTL)
const clientCache = new Map<string, { timestamp: number; data: VaultFolderResponse }>();
const CLIENT_CACHE_TTL = 5 * 60 * 1000;

export function parseDriveLink(url: string): {
  isDrive: boolean;
  type: 'file' | 'folder' | 'other';
  id?: string;
  embedUrl?: string;
  directUrl: string;
  downloadUrl?: string;
} {
  if (!url || typeof url !== 'string') {
    return { isDrive: false, type: 'other', directUrl: url || '#' };
  }

  const trimmed = url.trim();
  const isDrive = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');

  if (!isDrive) {
    return { isDrive: false, type: 'other', directUrl: trimmed };
  }

  // Folder match
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    const folderId = folderMatch[1];
    return {
      isDrive: true,
      type: 'folder',
      id: folderId,
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
      directUrl: trimmed,
    };
  }

  // File match
  let fileId: string | undefined;
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const docMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (fileMatch && fileMatch[1]) fileId = fileMatch[1];
  else if (openMatch && openMatch[1]) fileId = openMatch[1];
  else if (docMatch && docMatch[1]) fileId = docMatch[1];

  if (fileId) {
    return {
      isDrive: true,
      type: 'file',
      id: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directUrl: trimmed,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  return { isDrive: true, type: 'other', directUrl: trimmed };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fetches folder contents from the secure Supabase Edge Function or direct Google Drive API
 */
export async function fetchVaultFolderItems(
  targetFolderId: string = DEFAULT_ROOT_FOLDER_ID
): Promise<VaultFolderResponse> {
  const cleanId = targetFolderId.includes('/')
    ? parseDriveLink(targetFolderId).id || DEFAULT_ROOT_FOLDER_ID
    : targetFolderId.trim() || DEFAULT_ROOT_FOLDER_ID;

  // 1. Check client-side memory cache
  const cached = clientCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
    return { ...cached.data, cached: true };
  }

  // 2. Try Supabase Edge Function Proxy (caos-drive-vault / drive-vault)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('caos-drive-vault', {
        body: { folderId: cleanId },
      });

      if (!error && data && Array.isArray(data.items)) {
        const resPayload: VaultFolderResponse = {
          folderId: cleanId,
          items: data.items,
          cached: data.cached,
        };
        clientCache.set(cleanId, { timestamp: Date.now(), data: resPayload });
        return resPayload;
      }
    } catch (edgeErr) {
      console.warn('Supabase Edge Function caos-drive-vault not reachable:', edgeErr);
    }
  }

  // 3. Fallback: Direct Google Drive API v3 (if build-time environment variable is set)
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_DRIVE_API_KEY;

  if (!apiKey) {
    return {
      folderId: cleanId,
      items: [],
      error: 'Google Drive proxy is unavailable. Please verify the Supabase Edge Function is deployed.',
    };
  }

  try {
    const query = encodeURIComponent(`'${cleanId}' in parents and trashed = false`);
    const fields = encodeURIComponent(
      'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)'
    );
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=folder,name&pageSize=100&key=${apiKey}`;

    const res = await fetch(driveUrl);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        folderId: cleanId,
        items: [],
        error:
          errJson.error?.message ||
          `HTTP ${res.status}: Failed to read folder. Ensure folder is Shared with "Anyone with link".`,
      };
    }

    const driveData = await res.json();
    const items: VaultItem[] = (driveData.files || []).map((f: any) => {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
      const sizeBytes = f.size ? parseInt(f.size, 10) : undefined;
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        type: isFolder ? 'folder' : 'file',
        isFolder,
        size: isFolder ? 'Folder' : formatFileSize(sizeBytes),
        sizeBytes,
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : undefined,
        url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        downloadUrl: f.webContentLink || `https://drive.google.com/uc?export=download&id=${f.id}`,
        previewUrl: isFolder ? undefined : `https://drive.google.com/file/d/${f.id}/preview`,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        parentId: cleanId,
      };
    });

    const resPayload: VaultFolderResponse = {
      folderId: cleanId,
      items,
    };

    clientCache.set(cleanId, { timestamp: Date.now(), data: resPayload });
    return resPayload;
  } catch (err: any) {
    return {
      folderId: cleanId,
      items: [],
      error: err.message || 'Network error fetching folder contents',
    };
  }
}

/**
 * Deep scan a Google Drive folder tree and convert files into AcademicResource records
 */
export async function deepScanDriveFolderTree(
  rootFolderUrl: string,
  subjects: Array<{ id: string; name: string; shortName?: string; code?: string }>,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; resources: any[]; error?: string }> {
  try {
    const rootParsed = parseDriveLink(rootFolderUrl);
    const rootId = rootParsed.id || DEFAULT_ROOT_FOLDER_ID;

    onProgress?.('Fetching root folder structure...');
    const rootRes = await fetchVaultFolderItems(rootId);
    if (rootRes.error) {
      return { success: false, resources: [], error: rootRes.error };
    }

    const resources: any[] = [];
    const queue: Array<{ id: string; path: string; category?: string }> = [];

    // Categorize top-level folders
    for (const item of rootRes.items) {
      if (item.isFolder) {
        let cat: 'pyq' | 'senior_notes' | 'practical' | 'theory' | 'curriculum' | 'general' = 'general';
        const lower = item.name.toLowerCase();
        if (lower.includes('pyq') || lower.includes('previous')) cat = 'pyq';
        else if (lower.includes('notes') && lower.includes('senior')) cat = 'senior_notes';
        else if (lower.includes('practical') || lower.includes('lab')) cat = 'practical';
        else if (lower.includes('theory') || lower.includes('class')) cat = 'theory';

        queue.push({ id: item.id, path: item.name, category: cat });
      } else {
        // Top-level file (e.g. syllabus PDF)
        resources.push(createResourceFromItem(item, 'Curriculum / Batch Root', 'curriculum', subjects));
      }
    }

    // Process subfolders
    let scannedCount = 0;
    while (queue.length > 0 && scannedCount < 25) {
      const current = queue.shift()!;
      scannedCount++;
      onProgress?.(`Scanning "${current.path}" (${resources.length} files found)...`);

      const folderRes = await fetchVaultFolderItems(current.id);
      if (folderRes.items) {
        for (const item of folderRes.items) {
          if (item.isFolder) {
            queue.push({
              id: item.id,
              path: `${current.path} / ${item.name}`,
              category: current.category,
            });
          } else {
            resources.push(
              createResourceFromItem(item, current.path, current.category || 'theory', subjects)
            );
          }
        }
      }
    }

    onProgress?.(`Scan complete! ${resources.length} resources cataloged.`);
    return { success: true, resources };
  } catch (err: any) {
    return { success: false, resources: [], error: err.message || 'Unknown scan error' };
  }
}

function createResourceFromItem(
  item: VaultItem,
  folderPath: string,
  category: string,
  subjects: Array<{ id: string; name: string; shortName?: string; code?: string }>
) {
  // Try to match subject from item name or path
  let matchedSubject = subjects.find(
    (s) =>
      item.name.toLowerCase().includes(s.name.toLowerCase()) ||
      (s.shortName && item.name.toLowerCase().includes(s.shortName.toLowerCase())) ||
      folderPath.toLowerCase().includes(s.name.toLowerCase()) ||
      (s.shortName && folderPath.toLowerCase().includes(s.shortName.toLowerCase()))
  );

  if (!matchedSubject && subjects.length > 0) {
    matchedSubject = subjects[0];
  }

  let resourceType: 'lecture_notes' | 'pyq' | 'question_bank' | 'reference_book' | 'lab_manual' =
    'lecture_notes';
  if (category === 'pyq') resourceType = 'pyq';
  else if (category === 'practical') resourceType = 'lab_manual';
  else if (category === 'curriculum') resourceType = 'reference_book';

  return {
    id: `gdrive-${item.id}`,
    subjectId: matchedSubject?.id || 'sub-general',
    subjectName: matchedSubject?.name || 'Automation and Robotics',
    title: item.name.replace(/\.[^/.]+$/, ''),
    topic: folderPath,
    type: resourceType,
    category,
    currentVersion: 'v1.0',
    fileSize: item.size || 'Google Drive File',
    fileUrl: item.url,
    driveEmbedUrl: item.previewUrl,
    uploadedBy: 'Google Drive Sync',
    uploadDate: item.modifiedTime || 'Synced',
    isPinned: false,
    versions: [
      {
        versionTag: 'v1.0',
        changelogNote: 'Imported from Google Drive Vault',
        uploadDate: item.modifiedTime || 'Synced',
        fileSize: item.size || 'Google Drive File',
        fileUrl: item.url,
        uploadedBy: 'Google Drive Sync',
      },
    ],
  };
}
