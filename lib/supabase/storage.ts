import { supabase } from './client';

const ASSET_BUCKET = 'studio-assets';

export function formatFileSize(bytes: number): string {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function uploadAssetFile(userId: string, file: File): Promise<{ url: string; path: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export function detectAssetType(file: File): 'image' | 'video' | 'document' | 'audio' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}
