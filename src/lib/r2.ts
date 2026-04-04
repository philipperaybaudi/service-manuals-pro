import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Get the R2 bucket binding for document storage.
 * Only works in Cloudflare Pages runtime (not local dev).
 */
export function getDocumentsBucket(): R2Bucket {
  const { env } = getRequestContext();
  return (env as any).DOCUMENTS_BUCKET as R2Bucket;
}

/**
 * Stream a file from R2 and return a Response with Content-Disposition: attachment.
 * Returns null if the file is not found.
 */
export async function getDocumentFromR2(
  filePath: string,
  downloadFileName: string
): Promise<Response | null> {
  const bucket = getDocumentsBucket();
  const object = await bucket.get(filePath);

  if (!object) {
    return null;
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
      'Content-Length': object.size.toString(),
      'Cache-Control': 'no-store',
      'ETag': object.httpEtag,
    },
  });
}
