import { GoogleGenAI } from '@google/genai';

export interface TranscribeRequest {
  audioBase64: string;
  mimeType?: string;
  language?: 'hi' | 'en';
}

export interface TranscribeResponse {
  success: boolean;
  text?: string;
  language?: string;
  error?: string;
  isPendingConfig?: boolean;
}

export interface SpeakRequest {
  text: string;
  language?: 'hi' | 'en';
  voice?: string;
}

export interface SpeakResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  audioBuffer?: Buffer;
  error?: string;
  isPendingConfig?: boolean;
}

// In-memory rate limiting map: IP -> timestamp[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

/**
 * Validates request rate limit per client identifier
 */
export function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientId, validTimestamps);
  return true;
}

/**
 * Creates standard 44-byte RIFF WAV header for raw PCM audio
 */
export function createWavHeader(
  dataLength: number,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

const SUPPORTED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/flac'
]);

/**
 * Transcribe Audio with Google Gemini Speech-to-Text
 */
export async function transcribeWithGemini(
  req: TranscribeRequest,
  apiKeyOverride?: string
): Promise<TranscribeResponse> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'Google Gemini Voice service is pending configuration on server (GEMINI_API_KEY is missing).',
      isPendingConfig: true
    };
  }

  if (!req.audioBase64 || typeof req.audioBase64 !== 'string') {
    return {
      success: false,
      error: 'Invalid audio data: audioBase64 string is required.'
    };
  }

  // Strip potential data URL prefix
  let cleanBase64 = req.audioBase64;
  let inferredMime = req.mimeType || 'audio/webm';

  if (cleanBase64.includes(';base64,')) {
    const parts = cleanBase64.split(';base64,');
    const mimeMatch = parts[0].match(/data:(.*?)$/);
    if (mimeMatch && mimeMatch[1]) {
      inferredMime = mimeMatch[1];
    }
    cleanBase64 = parts[1];
  }

  // Sanitize MIME (strip parameters like ;codecs=opus for base validation)
  const baseMime = inferredMime.split(';')[0].trim().toLowerCase();
  if (!SUPPORTED_AUDIO_MIMES.has(inferredMime.toLowerCase()) && !SUPPORTED_AUDIO_MIMES.has(baseMime)) {
    return {
      success: false,
      error: `Unsupported audio format: "${inferredMime}". Supported types: webm, ogg, wav, mp3, mp4, aac, flac.`
    };
  }

  // Size limit: 10 MB base64 string ~ 7.5 MB raw audio
  if (cleanBase64.length > 10 * 1024 * 1024) {
    return {
      success: false,
      error: 'Audio recording exceeds maximum allowed size (10 MB).'
    };
  }

  // Reject empty recording (< 200 base64 chars is essentially silence or empty header)
  if (cleanBase64.length < 200) {
    return {
      success: false,
      error: 'Empty audio recording. Please speak clearly into the microphone.'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const targetModel = process.env.GEMINI_STT_MODEL || 'gemini-3.5-transcribe';

    const languageHint = req.language === 'hi' ? 'Hindi or Hinglish' : 'Indian English or English';
    const transcriptionPrompt = `Generate a transcript of the speech.
Target language: ${languageHint}.
Instructions:
- Transcribe verbatim exactly what was spoken.
- If spoken in Hindi, transcribe in Devanagari script (or standard Hinglish if mixed).
- If spoken in English, transcribe in English.
- Output ONLY the transcribed text. Do not add quotes, commentary, markdown headings, or conversational pleasantries.`;

    // Attempt primary model, with fallback to gemini-2.5-flash / gemini-2.0-flash if preview model is unavailable
    const modelsToTry = [
      targetModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    let lastError: any = null;
    let transcribedText = '';

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: baseMime,
                data: cleanBase64
              }
            },
            {
              text: transcriptionPrompt
            }
          ]
        });

        if (response && response.text) {
          transcribedText = response.text.trim();
          if (transcribedText) break;
        }
      } catch (err: any) {
        lastError = err;
        // If 404 model not found, try next model in fallback list
        if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('unsupported model')) {
          continue;
        }
        throw err;
      }
    }

    if (!transcribedText && lastError) {
      throw lastError;
    }

    // Clean any residual markdown or surrounding quotes
    transcribedText = transcribedText.replace(/^["']|["']$/g, '').trim();

    return {
      success: true,
      text: transcribedText,
      language: req.language
    };
  } catch (err: any) {
    // Check for quota or auth errors
    const errMsg = err.message || String(err);
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
      return {
        success: false,
        error: 'Invalid Google Gemini API Key. Please verify your GEMINI_API_KEY environment variable.'
      };
    }
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
      return {
        success: false,
        error: 'Google Gemini API quota exceeded. Please check your billing or quota allocation.'
      };
    }

    return {
      success: false,
      error: `Gemini transcription failed: ${errMsg.slice(0, 150)}`
    };
  }
}

/**
 * Generate Spoken Audio with Google Gemini Text-to-Speech
 */
export async function speakWithGemini(
  req: SpeakRequest,
  apiKeyOverride?: string
): Promise<SpeakResponse> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'Google Gemini Voice service is pending configuration on server (GEMINI_API_KEY is missing).',
      isPendingConfig: true
    };
  }

  const cleanText = (req.text || '').trim();
  if (!cleanText) {
    return {
      success: false,
      error: 'Text to speak cannot be empty.'
    };
  }

  if (cleanText.length > 2000) {
    return {
      success: false,
      error: 'Text to speak exceeds maximum limit of 2,000 characters.'
    };
  }

  // Voice selection: Google Prebuilt Voices: Puck, Charon, Kore, Fenrir, Aoede
  const selectedVoice =
    req.voice || (req.language === 'hi' ? 'Kore' : 'Puck');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const targetModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';

    const modelsToTry = [
      targetModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    let lastError: any = null;
    let audioData: { data: string; mimeType: string } | null = null;

    for (const model of modelsToTry) {
      try {
        const response: any = await ai.models.generateContent({
          model,
          contents: [
            {
              text: `Read the following text aloud with natural pronunciation and pacing without alteration:\n\n${cleanText}`
            }
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice
                }
              }
            }
          }
        });

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            audioData = {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav'
            };
            break;
          }
        }

        if (audioData) break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('unsupported model')) {
          continue;
        }
        throw err;
      }
    }

    if (!audioData) {
      if (lastError) throw lastError;
      return {
        success: false,
        error: 'Google Gemini did not return an audio stream for the requested text.'
      };
    }

    let buffer = Buffer.from(audioData.data, 'base64');
    let outMime = audioData.mimeType;

    // If Gemini returns raw PCM, wrap in standard WAV header for immediate HTML5 audio playback
    if (outMime.includes('pcm') || outMime.includes('l16') || !outMime.includes('wav')) {
      const sampleRateMatch = outMime.match(/rate=(\d+)/);
      const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
      const wavHeader = createWavHeader(buffer.length, sampleRate, 1, 16);
      buffer = Buffer.concat([wavHeader, buffer]);
      outMime = 'audio/wav';
    }

    return {
      success: true,
      audioBuffer: buffer,
      audioBase64: buffer.toString('base64'),
      mimeType: outMime
    };
  } catch (err: any) {
    const errMsg = err.message || String(err);
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401')) {
      return {
        success: false,
        error: 'Invalid Google Gemini API Key. Please verify your GEMINI_API_KEY environment variable.'
      };
    }
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
      return {
        success: false,
        error: 'Google Gemini API quota exceeded. Please check your billing or quota allocation.'
      };
    }

    return {
      success: false,
      error: `Gemini speech synthesis failed: ${errMsg.slice(0, 150)}`
    };
  }
}

