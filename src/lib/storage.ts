/**
 * Izvlači path unutar Supabase bucket-a iz public URL-a.
 *
 * Primjer:
 *   https://<project>.supabase.co/storage/v1/object/public/ads/ads/user123/tmp/file.webp
 * → "ads/user123/tmp/file.webp"
 *
 * Ako URL nije Supabase public object ili bucket ne odgovara (ako je prosleđen),
 * vraća null.
 */
export function extractStoragePath(publicUrl: string, expectedBucket?: string): string | null {
  try {
    const u = new URL(publicUrl);
    const prefix = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(prefix);
    if (idx === -1) return null;

    const rest = u.pathname.slice(idx + prefix.length); // "bucket/path..."
    const firstSlash = rest.indexOf('/');
    if (firstSlash === -1) return null;

    const bucket = rest.slice(0, firstSlash);
    const objectPath = rest.slice(firstSlash + 1);
    if (!objectPath) return null;

    if (expectedBucket && bucket !== expectedBucket) return null;

    return objectPath;
  } catch {
    return null;
  }
}

/**
 * Briše tmp fajlove iz Supabase storage-a (upload session cleanup).
 * Koristi se kad createAd failuje da ne ostaju orphan fajlovi.
 * Nikad ne baca – greške se samo loguju.
 */
export async function cleanupTmpUploads(
  supabase: { storage: { from: (b: string) => { remove: (paths: string[]) => Promise<{ error?: unknown }> } } } | null,
  bucket: string,
  imageUrls: { url: string; thumbUrl?: string | null }[]
): Promise<void> {
  if (!supabase || !imageUrls?.length) return;
  const pathsToDelete: string[] = [];
  for (const img of imageUrls) {
    if (img?.url && typeof img.url === 'string') {
      const p = extractStoragePath(img.url, bucket);
      if (p && p.includes('/tmp/')) pathsToDelete.push(p);
    }
    if (img?.thumbUrl && typeof img.thumbUrl === 'string') {
      const p = extractStoragePath(img.thumbUrl, bucket);
      if (p && p.includes('/tmp/')) pathsToDelete.push(p);
    }
  }
  const unique = [...new Set(pathsToDelete)];
  if (unique.length === 0) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove(unique);
    if (error) {
      console.error(
        JSON.stringify({
          event: 'cleanup_tmp_uploads_error',
          bucket,
          pathsCount: unique.length,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'cleanup_tmp_uploads_exception',
        bucket,
        pathsCount: unique.length,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

/**
 * Briše sve slike oglasa iz Supabase storage-a.
 * Koristi se pri brisanju oglasa (ručno ili lifecycle).
 * Nikad ne baca – greške se samo loguju.
 */
export async function deleteAdImagesFromStorage(
  supabase: { storage: { from: (b: string) => { remove: (paths: string[]) => Promise<{ error?: unknown }> } } } | null,
  bucket: string,
  images: { url: string; thumbUrl?: string | null }[]
): Promise<void> {
  if (!supabase || !images?.length) return;
  const pathsToDelete: string[] = [];
  for (const img of images) {
    if (img?.url && typeof img.url === 'string') {
      const p = extractStoragePath(img.url, bucket);
      if (p) pathsToDelete.push(p);
    }
    if (img?.thumbUrl && typeof img.thumbUrl === 'string') {
      const p = extractStoragePath(img.thumbUrl, bucket);
      if (p) pathsToDelete.push(p);
    }
  }
  const unique = [...new Set(pathsToDelete)];
  if (unique.length === 0) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove(unique);
    if (error) {
      console.error(
        JSON.stringify({
          event: 'delete_ad_images_storage_error',
          bucket,
          pathsCount: unique.length,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'delete_ad_images_storage_exception',
        bucket,
        pathsCount: unique.length,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

