import { CHAIN, CONTRACT_ADDRESS, SITE_URL } from '@/config';
import { NextRequest, NextResponse } from 'next/server';
import dataJson from './../eligible.json'

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export const dynamic = 'force-dynamic';

type FidEntry = {
  position: number;
  fid: number;
};

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: { trustedData?: { messageBytes?: string } } = await req.json();

    // Check if frame request is valid
    const status = await validateFrameRequest(body.trustedData?.messageBytes);

    if (!status?.valid) {
      console.error(status);
      throw new Error('Invalid frame request');
    }

    const fid_new = status?.action?.interactor?.fid ? JSON.stringify(status.action.interactor.fid) : null;

    const data: FidEntry[] = dataJson;

    const result = findFidPosition(data, Number(fid_new));

    if (!result) {
        return getResponse(ResponseType.NOT_ELIGIBLE);
    }

    return getResponse(ResponseType.ELIGIBLE);
  } catch (error) {
    console.error(error);
    return getResponse(ResponseType.ERROR);
  }
}

enum ResponseType {
  SUCCESS,
  ERROR,
  NOT_ELIGIBLE,
  ELIGIBLE
}

function getResponse(type: ResponseType) {
  const IMAGE = {
    [ResponseType.SUCCESS]: 'status/end.png',
    [ResponseType.ERROR]: 'status/error.png',
    [ResponseType.NOT_ELIGIBLE]: 'status/no-eligible.png',
    [ResponseType.ELIGIBLE]: 'status/eligible.png',
  }[type];
  const shouldRetry =
    type === ResponseType.ERROR || type === ResponseType.NOT_ELIGIBLE;
  return new NextResponse(`<!DOCTYPE html><html><head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${SITE_URL}/${IMAGE}" />
    <meta property="fc:frame:image:aspect_ratio" content="1:1" />
    <meta property="fc:frame:post_url" content="${SITE_URL}/api/frame" />
    ${
      shouldRetry
        ? `<meta property="fc:frame:button:1" content="Try again" />`
			: `
        <meta name="fc:frame:button:1" content="Calculate" />
        <meta name="fc:frame:button:1:action" content="post" />
        <meta name="fc:frame:button:1:target" content="${SITE_URL}/api/frame/calculate/" />
      `
    }
  </head></html>`);
}

async function validateFrameRequest(data: string | undefined) {
  if (!NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not set');
  if (!data) throw new Error('No data provided');

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      api_key: NEYNAR_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message_bytes_in_hex: data }),
  };

  return await fetch(
    'https://api.neynar.com/v2/farcaster/frame/validate',
    options,
  )
    .then((response) => response.json())
    .catch((err) => console.error(err));
}

const findFidPosition = (data: FidEntry[], fidToFind: number): number | false => {
  const entry = data.find(entry => entry.fid === fidToFind);
  return entry ? entry.position : false;
};