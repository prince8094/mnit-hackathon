export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Pinata IPFS configuration pending (PINATA_JWT missing on server)',
        isPendingConfig: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided in form data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build FormData for Pinata IPFS
    const pinataForm = new FormData();
    pinataForm.append('file', file);

    const fileName = (file as any).name || 'evidence_document';
    pinataForm.append(
      'pinataMetadata',
      JSON.stringify({
        name: fileName,
        keyvalues: {
          app: 'FundTrail',
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: pinataForm,
    });

    const data = (await pinataRes.json()) as any;
    if (!pinataRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || data.error || 'Pinata upload failed',
        }),
        {
          status: pinataRes.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        cid: data.IpfsHash,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
        size: data.PinSize,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error while pinning to IPFS',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

