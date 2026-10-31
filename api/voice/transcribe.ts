import { transcribeWithGemini, checkRateLimit } from '../../src/lib/gemini-voice-service';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res?: any): Promise<any> {
  const isNode = res && typeof res.status === 'function';

  // 1. CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(204).end();
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method !== 'POST') {
    const errorBody = { success: false, error: 'Method not allowed' };
    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(405).json(errorBody);
    }
    return new Response(JSON.stringify(errorBody), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Extract Client IP for rate limiting
  let clientIp = 'anonymous-client';
  if (isNode) {
    clientIp =
      req.headers['x-forwarded-for']?.toString() ||
      req.headers['x-real-ip']?.toString() ||
      req.socket?.remoteAddress ||
      'anonymous-client';
  } else if (req.headers && typeof req.headers.get === 'function') {
    clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous-client';
  }

  if (!checkRateLimit(clientIp)) {
    const rateLimitBody = {
      success: false,
      error: 'Too many voice requests. Please slow down and try again in a minute.',
    };
    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(429).json(rateLimitBody);
    }
    return new Response(JSON.stringify(rateLimitBody), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Parse Body
  try {
    let audioBase64 = '';
    let mimeType = 'audio/webm';
    let language: 'hi' | 'en' | undefined = undefined;

    if (isNode) {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {}
      }
      if (!body && req.readable && !req.readableEnded && typeof req[Symbol.asyncIterator] === 'function') {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          if (chunks.length > 0) {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          }
        } catch {}
      }
      body = body || {};
      audioBase64 = body.audioBase64 || '';
      mimeType = body.mimeType || 'audio/webm';
      language = body.language;
    } else {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        audioBase64 = body.audioBase64 || '';
        mimeType = body.mimeType || 'audio/webm';
        language = body.language;
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('audio') || formData.get('file');
        language = (formData.get('language') as 'hi' | 'en') || undefined;

        if (file && typeof file !== 'string') {
          const arrayBuf = await (file as Blob).arrayBuffer();
          audioBase64 = Buffer.from(arrayBuf).toString('base64');
          mimeType = (file as Blob).type || 'audio/webm';
        }
      }
    }

    const result = await transcribeWithGemini({
      audioBase64,
      mimeType,
      language,
    });

    const statusCode = result.success ? 200 : result.isPendingConfig ? 503 : 400;

    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(statusCode).json(result);
    }

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const errorBody = {
      success: false,
      error: err.message || 'An unexpected error occurred during transcription.',
    };
    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(500).json(errorBody);
    }
    return new Response(JSON.stringify(errorBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
