import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '../types';

export async function POST(req: NextRequest): Promise<Response> {
    let data: any = await getAllUsers();
	return NextResponse.json(data);
}