/**
 * Parse Figma URLs to extract file key and node ID.
 *
 * Supports:
 *   https://www.figma.com/design/FILEKEY/Name?node-id=123-456
 *   https://www.figma.com/file/FILEKEY/Name?node-id=123-456
 *   https://figma.com/design/FILEKEY/Name?node-id=123-456
 */

export interface FigmaUrlParts {
  fileKey: string;
  nodeId?: string;
}

/**
 * Extract `fileKey` and optional `nodeId` from a Figma URL.
 *
 * The node-id query parameter uses hyphens (`123-456`) in URLs but
 * the REST API expects colons (`123:456`), so we normalise here.
 */
export function parseFigmaUrl(url: string): FigmaUrlParts {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!parsed.hostname.endsWith('figma.com')) {
    throw new Error(`Not a Figma URL: ${url}`);
  }

  // pathname is e.g. /design/FILEKEY/Some-File-Name or /file/FILEKEY/Name
  const segments = parsed.pathname.split('/').filter(Boolean);
  const prefixIndex = segments.findIndex(
    (s) => s === 'design' || s === 'file'
  );

  if (prefixIndex === -1 || !segments[prefixIndex + 1]) {
    throw new Error(
      `Could not extract file key from URL. Expected /design/<key> or /file/<key>.`
    );
  }

  const fileKey = segments[prefixIndex + 1];

  // node-id comes as a query parameter with hyphens: node-id=123-456
  const rawNodeId = parsed.searchParams.get('node-id');
  const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : undefined;

  return { fileKey, nodeId };
}
