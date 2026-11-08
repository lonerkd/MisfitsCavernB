// Upload a file to Storage and say how far along it is. supabase-js's `upload()` uses fetch, which reports no
// upload progress, so this asks for a signed upload URL and sends the file with XMLHttpRequest, whose upload events
// do. The server-side rules are the same (the signed URL is only issued to someone allowed to write that path).
// Where there is no XMLHttpRequest, or the signed URL cannot be had, it falls back to the plain upload.

interface UploadStore {
  upload: (path: string, file: Blob, options: { contentType?: string; upsert?: boolean; cacheControl?: string }) => Promise<{ error: { message: string } | null }>;
  createSignedUploadUrl: (path: string, options?: { upsert: boolean }) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
}

export interface ProgressUploadOptions {
  contentType?: string;
  upsert?: boolean;
  /** Seconds, as supabase-js takes it. */
  cacheControl?: string;
}

export async function uploadWithProgress(
  store: UploadStore,
  path: string,
  file: Blob,
  options: ProgressUploadOptions,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ error: { message: string } | null }> {
  if (typeof XMLHttpRequest === 'undefined') return store.upload(path, file, options);
  // Overwrite permission is part of the signed token: the x-upsert header on the PUT alone cannot grant it.
  const signed = await store.createSignedUploadUrl(path, { upsert: options.upsert ?? false });
  if (signed.error || !signed.data) return store.upload(path, file, options);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signed.data!.signedUrl);
    xhr.setRequestHeader('x-upsert', String(options.upsert ?? false));
    xhr.setRequestHeader('cache-control', `max-age=${options.cacheControl ?? '3600'}`);
    if (options.contentType) xhr.setRequestHeader('content-type', options.contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onerror = () => resolve({ error: { message: 'The network dropped during the upload' } });
    xhr.onabort = () => resolve({ error: { message: 'The upload was cancelled' } });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(file.size, file.size); resolve({ error: null }); return; }
      let message = `The server answered ${xhr.status}`;
      try { const body = JSON.parse(xhr.responseText); message = body.message || body.error || message; } catch { /* not JSON */ }
      resolve({ error: { message } });
    };
    xhr.send(file);
  });
}
