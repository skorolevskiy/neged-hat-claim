import { abi } from '@/abi/ERC20';
import { CHAIN, CONTRACT_ADDRESS, SITE_URL } from '@/config';
import { NextRequest, NextResponse } from 'next/server';
import {
  Address,
  Hex,
  TransactionExecutionError,
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseEther
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getUser, updateRecieveDrop } from './../types';
import dataJson from './../eligible.json';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY as Hex | undefined;

const transport = http(process.env.RPC_URL);

const publicClient = createPublicClient({
  chain: CHAIN,
  transport,
});

const walletClient = createWalletClient({
  chain: CHAIN,
  transport,
});

type FidEntry = {
	position: number;
	fid: number;
  };
let points: number, power: string | null, tokens: number, position: number | false, checkTokens: number;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    if (!MINTER_PRIVATE_KEY) throw new Error('MINTER_PRIVATE_KEY is not set');

    const body: { trustedData?: { messageBytes?: string } } = await req.json();

    // Check if frame request is valid
    const status = await validateFrameRequest(body.trustedData?.messageBytes);

    if (!status?.valid) {
      console.error(status);
      throw new Error('Invalid frame request');
    }

    // Check if user has an address connected
    const address1: Address | undefined =
        status?.action?.interactor?.verifications?.[0];
    const address2: Address | undefined =
        status?.action?.interactor?.verifications?.[1];

    let rawBalance1: any, rawBalance2: any;
    let balance1: bigint;
    let balance2: bigint;
    if (!address1) {
        return getResponse(ResponseType.NO_ADDRESS);
    }

    const fid_new = status?.action?.interactor?.fid ? JSON.stringify(status.action.interactor.fid) : null;
    const power_badge = status?.action?.interactor?.power_badge ? status.action.interactor.power_badge : null;
    let address: string, recieveDrop: boolean;

    const User = await getUser(fid_new);
    let wallet;
    if (!User) {
        console.warn('user not found')
        return getResponse(ResponseType.ERROR);
    } else {
      wallet = User.wallet;
      recieveDrop = User.recievedrop;
      points = User.points;
    }
  
    if (recieveDrop) {
        return getResponse(ResponseType.ALREADY_MINTED);
    }

    const data: FidEntry[] = dataJson;

    position = findFidPosition(data, Number(fid_new));

    if (position !== false) {
        const numberPosition: number = position;
        if (numberPosition > 500) {
            tokens = 2000;
        }
    }

    let tokensString = JSON.stringify(tokens);

    console.warn(tokensString);

    const account = privateKeyToAccount(MINTER_PRIVATE_KEY); 

    const { request } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'transfer',
        args: [ wallet, parseEther(tokensString)],
        account: account,
      })
       
    if (!request) {
      throw new Error('Could not simulate contract');
    }

    console.warn(request);

    try {
        const hash = await walletClient.writeContract(request);

        if (hash) {
            await updateRecieveDrop(fid_new, true);
            console.warn(fid_new + " receive drop");
            return getResponse(ResponseType.SUCCESS);
        }
    } catch (error) {
        return getResponse(ResponseType.ERROR);
    }

    return getResponse(ResponseType.SUCCESS);
  } catch (error) {
    console.error(error);
    return getResponse(ResponseType.ERROR);
  }
}

enum ResponseType {
  SUCCESS,
  NEED_TOKEN,
  ERROR,
  NO_ADDRESS,
  ALREADY_MINTED
}

function getResponse(type: ResponseType) {
  const IMAGE = {
    [ResponseType.SUCCESS]: 'status/congrats.gif',
    [ResponseType.ERROR]: 'status/error.png',
    [ResponseType.NEED_TOKEN]: 'status/need-token.png',
    [ResponseType.NO_ADDRESS]: 'status/no-address.png',
    [ResponseType.ALREADY_MINTED]: 'status/congrats.gif',
  }[type];
  const shouldRetry =
    type === ResponseType.ERROR || type === ResponseType.ALREADY_MINTED;
  return new NextResponse(`<!DOCTYPE html><html><head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${SITE_URL}/${IMAGE}" />
    <meta property="fc:frame:image:aspect_ratio" content="1:1" />
    <meta property="fc:frame:post_url" content="${SITE_URL}/api/frame" />
    ${
      shouldRetry
        ? `<meta property="fc:frame:button:1" content="Try again" />`
        : ``
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
	const index = data.findIndex(entry => entry.fid === fidToFind);
	return index !== -1 ? index : false;
  };