import { speakWithGemini, checkRateLimit } from '../../src/lib/gemini-voice-service';

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
    let body: any = {};
    if (isNode) {
      body = req.body;
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
    } else {
      body = await req.json();
    }

    const { text, language, voice } = body;

    const result = await speakWithGemini({
      text,
      language,
      voice,
    });

    if (!result.success) {
      const statusCode = result.isPendingConfig ? 503 : 400;
      if (isNode) {
        Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        return res.status(statusCode).json(result);
      }
      return new Response(JSON.stringify(result), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Binary audio or JSON
    const acceptHeader = isNode ? (req.headers['accept'] || '') : (req.headers.get('accept') || '');
    if (acceptHeader.includes('audio/') && result.audioBuffer) {
      if (isNode) {
        Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', result.mimeType || 'audio/wav');
        res.setHeader('Content-Length', String(result.audioBuffer.length));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).end(result.audioBuffer);
      }

      return new Response(result.audioBuffer as any, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': result.mimeType || 'audio/wav',
          'Content-Length': String(result.audioBuffer.length),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const jsonResponse = {
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType || 'audio/wav',
    };

    if (isNode) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(200).json(jsonResponse);
    }

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const errorBody = {
      success: false,
      error: err.message || 'An unexpected error occurred during speech synthesis.',
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
