/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { transcribeWithGemini, speakWithGemini } from './src/lib/gemini-voice-service';

function geminiVoiceServerPlugin() {
  return {
    name: 'gemini-voice-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/voice/transcribe' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            let body: any = {};
            try {
              body = JSON.parse(rawBody);
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
              return;
            }

            const result = await transcribeWithGemini({
              audioBase64: body.audioBase64,
              mimeType: body.mimeType,
              language: body.language,
            });

            res.statusCode = result.success ? 200 : result.isPendingConfig ? 503 : 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        if (url === '/api/voice/speak' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            let body: any = {};
            try {
              body = JSON.parse(rawBody);
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
              return;
            }

            const result = await speakWithGemini({
              text: body.text,
              language: body.language,
              voice: body.voice,
            });

            if (!result.success) {
              res.statusCode = result.isPendingConfig ? 503 : 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
              return;
            }

            const accept = req.headers['accept'] || '';
            if (accept.includes('audio/') && result.audioBuffer) {
              res.statusCode = 200;
              res.setHeader('Content-Type', result.mimeType || 'audio/wav');
              res.setHeader('Content-Length', String(result.audioBuffer.length));
              res.end(result.audioBuffer);
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                audioBase64: result.audioBase64,
                mimeType: result.mimeType || 'audio/wav',
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

function pinataServerPlugin(pinataJwt: string) {
  return {
    name: 'pinata-server-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/ipfs/upload', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!pinataJwt) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: 'Pinata IPFS configuration pending (PINATA_JWT missing)',
            isPendingConfig: true
          }));
          return;
        }

        try {
          const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${pinataJwt}`,
              'Content-Type': req.headers['content-type']
            },
            body: req,
            duplex: 'half'
          } as any);

          const data = await pinataRes.json();
          if (!pinataRes.ok) {
            res.statusCode = pinataRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: data.error?.message || data.error || 'Pinata upload failed'
            }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            cid: data.IpfsHash,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
            size: data.PinSize
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pinataJwt = env.PINATA_JWT || process.env.PINATA_JWT || '';

  return {
    plugins: [react(), pinataServerPlugin(pinataJwt), geminiVoiceServerPlugin()],
    server: {
      port: 5173,
      host: true
    },
    test: {
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    }
  };
});

