import * as kysely from 'kysely'
import { createKysely } from '@vercel/postgres-kysely'
import { sql } from '@vercel/postgres'

export interface PlayersTable {
	id: kysely.Generated<number>;
	fid: string | null;
	username: string | null;
	name: string | null;
	points: number;
	dailySpins: number;
	recievedrop: boolean;
	lastSpin: kysely.ColumnType<Date, string | undefined, never>;
	createdAt: kysely.ColumnType<Date, string | undefined, never>;
	refFid: string | null;
	wallet: string | null;
}

// Keys of this interface are table names.
export interface Database {
	players: PlayersTable
}

export const db = createKysely<Database>()
export { sql } from 'kysely'

export async function getUser(fid: string | null): Promise<any> {
	let data: any;

	try {
		data = await db
			.selectFrom('players')
			.where('fid', '=', fid)
			.selectAll()
			.executeTakeFirst();
		return data; // Data fetched successfully
	} catch (e: any) {
		if (e.message.includes('relation "spiners" does not exist')) {
			console.warn(
				'Table does not exist, creating and seeding it with dummy data now...'
			);
			// Table is not created yet
			//await seed();
			return false; // Data fetched successfully after seeding
		} else {
			console.error('Error fetching data:', e);
			return false; // Error occurred while fetching data
		}
	}
}

export async function updateRecieveDrop(fid: string | null, newValue: boolean): Promise<void> {
	await db
		.updateTable('players')
		.set({
			recievedrop: newValue
		  })
		.where('fid', '=', fid)
		.executeTakeFirst()
}

export async function getAllUsers() {
	let data: any;
	data = await db
			.selectFrom('players')
			.selectAll()
			.orderBy('points desc')
			.where('recievedrop', '=', true)
			.execute();
	return data;
}