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

    if (!address1) {
        return getResponse(ResponseType.NO_ADDRESS);
    }

    const fid_new = status?.action?.interactor?.fid ? JSON.stringify(status.action.interactor.fid) : null;
    let recieveDrop: boolean;

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
			const numberPosition:number = position;
			tokens = getPrize(numberPosition);
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
    [ResponseType.SUCCESS]: 'https://gateway.lighthouse.storage/ipfs/bafybeihp5u7vdjr63n7xymmfhojv2ibaspnrxxqtvhdjhr2y4fcwob7k64',
    [ResponseType.ERROR]: SITE_URL + '/status/error.png',
    [ResponseType.NEED_TOKEN]: SITE_URL + '/status/need-token.png',
    [ResponseType.NO_ADDRESS]: SITE_URL + '/status/no-address.png',
    [ResponseType.ALREADY_MINTED]: 'https://gateway.lighthouse.storage/ipfs/bafybeihp5u7vdjr63n7xymmfhojv2ibaspnrxxqtvhdjhr2y4fcwob7k64',
  }[type];
  const shouldRetry =
    type === ResponseType.ERROR || type === ResponseType.ALREADY_MINTED;
  return new NextResponse(`<!DOCTYPE html><html><head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${IMAGE}" />
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

  function getPrize(position: number): number {
    if (position === 1) {
        return 1000000;
    } else if (position === 2) {
        return 250000;
    } else if (position === 3) {
        return 100000;
    } else if (position === 4) {
        return 75000;
    } else if (position === 5) {
        return 50000;
    } else if (position === 6) {
        return 40000;
    } else if (position === 7) {
        return 30000;
    } else if (position === 8) {
        return 20000;
    } else if (position === 9) {
        return 10000;
    } else if (position === 10) {
        return 5000;
    } else if (position >= 11 && position <= 1000) {
        return 3000;
    } else if (position >= 1001 && position <= 3000) {
        return 1500;
    } else if (position >= 3001 && position <= 5000) {
        return 1000;
    } else {
        return 0;
    }
}