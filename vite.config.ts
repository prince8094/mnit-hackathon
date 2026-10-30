/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react(), pinataServerPlugin(pinataJwt)],
    server: {
      port: 5173,
      host: true
    },
    test: {
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    }
  };
});

