import type { IncomingMessage, ServerResponse } from 'http';

interface WebDavConfig {
  url: string;
  username: string;
  password: string;
}

interface SyncRequestBody {
  action: 'push' | 'pull';
  webdav: WebDavConfig;
  data?: any;
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse & { status?: (code: number) => any; json?: (body: any) => any }) {
  const method = req.method || 'GET';

  if (method !== 'POST') {
    // Fallback for plain Node response objects
    (res as any).statusCode = 405;
    (res as any).setHeader?.('Content-Type', 'application/json');
    (res as any).end?.(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body: SyncRequestBody;
  try {
    body = (req as any).body || {};
  } catch (e) {
    (res as any).statusCode = 400;
    (res as any).setHeader?.('Content-Type', 'application/json');
    (res as any).end?.(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  const { action, webdav, data } = body || {};

  if (!webdav || !webdav.url || !webdav.username || !webdav.password) {
    (res as any).statusCode = 400;
    (res as any).setHeader?.('Content-Type', 'application/json');
    (res as any).end?.(JSON.stringify({ error: 'Missing WebDAV configuration' }));
    return;
  }

  const headers: Record<string, string> = {
    Authorization: 'Basic ' + Buffer.from(`${webdav.username}:${webdav.password}`).toString('base64')
  };

  try {
    if (action === 'push') {
      headers['Content-Type'] = 'application/json';
      const response = await fetch(webdav.url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data ?? {}, null, 2)
      } as any);

      const ok = (response as any).ok;
      if (!ok) {
        const status = (response as any).status;
        const statusText = (response as any).statusText;
        throw new Error(`WebDAV upload failed: ${status} ${statusText}`);
      }

      (res as any).statusCode = 200;
      (res as any).setHeader?.('Content-Type', 'application/json');
      (res as any).end?.(JSON.stringify({ success: true }));
      return;
    }

    if (action === 'pull') {
      const response = await fetch(webdav.url, {
        method: 'GET',
        headers
      } as any);

      const ok = (response as any).ok;
      if (!ok) {
        const status = (response as any).status;
        const statusText = (response as any).statusText;
        throw new Error(`WebDAV download failed: ${status} ${statusText}`);
      }

      const text = await (response as any).text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON from WebDAV');
      }

      (res as any).statusCode = 200;
      (res as any).setHeader?.('Content-Type', 'application/json');
      (res as any).end?.(JSON.stringify({ success: true, data: json }));
      return;
    }

    (res as any).statusCode = 400;
    (res as any).setHeader?.('Content-Type', 'application/json');
    (res as any).end?.(JSON.stringify({ error: 'Invalid action' }));
  } catch (error: any) {
    (res as any).statusCode = 500;
    (res as any).setHeader?.('Content-Type', 'application/json');
    (res as any).end?.(JSON.stringify({ error: error?.message || 'WebDAV proxy error' }));
  }
}
