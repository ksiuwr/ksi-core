import { db } from '@ksi-core/backend/db';
import { createElysia, createProtectedElysia } from '@ksi-core/backend/lib/createElysia';
import { discordBot, DiscordRankStatus } from '@ksi-core/backend/lib/discord';
import Elysia, { status } from 'elysia';

export const discordRank = (app: Elysia) =>
	app.derive(async ({ user }) => {
		const userAccount = await db.query.account.findFirst({
			where: (account, { eq }) => eq(account.userId, user.id)
		});
		if (!userAccount)
			return {
				discordRank: DiscordRankStatus.NOT_FOUND
			};

		return {
			discordRank: await discordBot.getUserRank(userAccount.accountId)
		};
	});

export const rankRequired = (rankRequired?: 'DEV' | 'ADMIN') => (app: Elysia) =>
	app.use(discordRank).derive(async ({ discordRank }) => {
		if (rankRequired === undefined && discordRank <= 1) throw status(403);
		if (
			(rankRequired === 'DEV' && discordRank !== DiscordRankStatus.RANK_DEV) ||
			(rankRequired === 'ADMIN' && discordRank !== DiscordRankStatus.RANK_ADMIN)
		)
			throw status(403);
		return { discordRank };
	});
