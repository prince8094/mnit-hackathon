import { speakWithGemini, checkRateLimit } from '../../src/lib/gemini-voice-service';

export const config = {
  maxDuration: 30, // 30s timeout
};

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
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
    const body = await req.json();
    const { text, language, voice } = body;

    const result = await speakWithGemini({
      text,
      language,
      voice,
    });

    if (!result.success) {
      const statusCode = result.isPendingConfig ? 503 : 400;
      return new Response(JSON.stringify(result), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if client expects binary audio directly or JSON
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('audio/') && result.audioBuffer) {
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

    // Default JSON response containing base64 audio
    return new Response(
      JSON.stringify({
        success: true,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType || 'audio/wav',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'An unexpected error occurred during speech synthesis.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
