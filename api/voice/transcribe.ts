import { transcribeWithGemini, checkRateLimit } from '../../src/lib/gemini-voice-service';

export const config = {
  maxDuration: 30, // 30s timeout
};

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting check
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous-client';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many voice requests. Please slow down and try again in a minute.',
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let audioBase64 = '';
    let mimeType = 'audio/webm';
    let language: 'hi' | 'en' | undefined = undefined;

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
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unsupported content-type. Please send application/json with audioBase64 or multipart/form-data.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await transcribeWithGemini({
      audioBase64,
      mimeType,
      language,
    });

    const statusCode = result.success ? 200 : result.isPendingConfig ? 503 : 400;
    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'An unexpected error occurred during transcription.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
