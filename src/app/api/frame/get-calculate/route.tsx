import { SITE_URL } from '@/config';
import { ImageResponse } from 'next/og';
import { getUser } from '../types';
import dataJson from './../eligible.json';
// App router includes @vercel/og.
// No need to install it.

let fid: string | null, username: string, points: number, power: string | null, tokens: number, position: number | false, amount: number, numberPosition: number;

type FidEntry = {
	position: number;
	fid: number;
  };

export async function GET(request: Request) {
	const fontData = await fetch(
		new URL(SITE_URL + '/assets/NanumPenScript-Regular.ttf', import.meta.url),
	  ).then((res) => res.arrayBuffer());

	try {
		const { searchParams } = new URL(request.url);

		const hasFid = searchParams.has('fid');
		fid = hasFid ? searchParams.get('fid') : null;

		const user = await getUser(fid);

		if (!user) {
			points = 0;
		} else {
			points = user.points;
			username = user.username.slice(1, -1);
		}

		const data: FidEntry[] = dataJson;

    	position = findFidPosition(data, Number(fid));

		if (position !== false) {
			numberPosition = position;
			tokens = getPrize(numberPosition);
		}

		return new ImageResponse(
			(
				<div
					style={{
						fontFamily: 'Nanum Pen, Inter, "Material Icons"',
						fontSize: 40,
						color: 'black',
						background: '#fff',
						width: '100%',
						height: '100%',
						padding: '50px 50px',
						textAlign: 'center',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						flexDirection: 'column',
						flexWrap: 'nowrap',
					}}
				>
					<div
						style={{
							fontFamily: 'Nanum Pen, Inter, "Material Icons"',
							fontSize: 100,
							fontStyle: 'normal',
							fontWeight: 700,
							color: '#8a60f4',
							lineHeight: 1,
							whiteSpace: 'pre-wrap',
						}}
					>
						Calculation results
					</div>

                    <div
                        style={{
                            fontFamily: 'Nanum Pen, Inter, "Material Icons"',
                            fontSize: 80,
                            fontStyle: 'normal',
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                            color: 'black',
                            lineHeight: 1,
                            whiteSpace: 'pre-wrap',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '720px',
                            gap: '16px'
                        }}
                    >
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{display: 'flex',}}>Your <span style={{color: '#8a60f4',}}>fid</span>:</div> 
                            <div style={{display: 'flex',}}>{fid}</div>
                        </div>

						{/* <div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{display: 'flex',}}>Username:</div> 
                            <div style={{display: 'flex',}}>{'@' + username}</div>
                        </div> */}

						<div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{display: 'flex',}}>Your <span style={{color: '#8a60f4',}}>points</span>:</div>
                            <div style={{display: 'flex',}}>{points}</div>
                        </div> 

						<div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{display: 'flex',}}>Your <span style={{color: '#8a60f4',}}>place</span>:</div>
                            <div style={{display: 'flex',}}>{position}</div>
                        </div>

                                              

                        <div style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{display: 'flex',}}><span style={{color: '#8a60f4',}}>Tokens</span> be <span style={{color: '#8a60f4',}}>received</span>:</div>
                            <div style={{display: 'flex',}}>{tokens}</div>
                        </div>
                        
                    </div>

					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							width: '100%',
							fontFamily: 'Nanum Pen, Inter, "Material Icons"',
							fontSize: 40,
							fontStyle: 'normal',
							color: 'black',
							lineHeight: 1.4,
							whiteSpace: 'pre-wrap',
						}}
					>
						<p>Build by <span style={{color: '#8a60f4',}}>Neged</span>, dev <span style={{color: '#8a60f4',}}>@eat</span></p>
						<img
							alt="pill"
							width="64"
							height="64"
							src={SITE_URL + '/status/logo.png'}
							/>
					</div>
				</div>
			),
			{
				width: 960,
				height: 960,
				fonts: [
					{
					  name: 'Geist',
					  data: fontData,
					  style: 'normal',
					},
				  ],
			},
		);
	} catch (e: any) {
		console.log(`${e.message}`);
		return new Response(`Failed to generate the image`, {
			status: 500,
		});
	}
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