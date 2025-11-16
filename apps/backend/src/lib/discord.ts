import { Client, Events, GatewayIntentBits } from 'discord.js';
import ms from "ms"

const CACHE_TIME = ms('5m');

export enum DiscordRankStatus {
    NOT_FOUND,
    NO_RANK,
    RANK_ADMIN,
    RANK_DEV,
}

type CacheEntry = {
    status: DiscordRankStatus;
    expiresAt: number;
};

class DiscordBot {
    client: Client;
    #cache: Map<string, CacheEntry> = new Map();

    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

        this.client.on(Events.ClientReady, readyClient => {
            console.log(`[Discord] Logged in as ${readyClient.user.tag}!`);
        });

        this.client.login(Bun.env.DISCORD_BOT_TOKEN);

        this.#registerListeners()
    }

    #registerListeners() {
        this.client.on("guildMemberUpdate", async (m) => {
            if (m.guild.id === Bun.env.DISCORD_GUILD_ID) {
                const cached = this.#cache.get(m.user.id);
                if (cached) {
                    this.#cache.delete(m.user.id);
                }
            }
        })
    }

    #addCache(userId: string, status: DiscordRankStatus): DiscordRankStatus {
        const expiresAt = Date.now() + CACHE_TIME;
        this.#cache.set(userId, { status, expiresAt });
        return status;
    }

    #pruneCache() {
        const now = Date.now();
        for (const [id, entry] of this.#cache.entries()) {
            if (entry.expiresAt <= now) this.#cache.delete(id);
        }
    }

    ping(): boolean {
        return this.client.isReady();
    }

    async getUserRank(userId: string): Promise<DiscordRankStatus> {
        this.#pruneCache();

        const cached = this.#cache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.status;
        }

        await this.client.guilds.fetch();

        const guildId = Bun.env.DISCORD_GUILD_ID!;
        if (!this.client.guilds.cache.has(guildId)) {
            return this.#addCache(userId, DiscordRankStatus.NOT_FOUND);
        }

        const guild = this.client.guilds.cache.get(guildId)!;
        const member = await guild.members.fetch(userId);
        if (!member) return this.#addCache(userId, DiscordRankStatus.NOT_FOUND);

        if (member.roles.cache.has(Bun.env.DISCORD_ROLE_DEV!))
            return this.#addCache(userId, DiscordRankStatus.RANK_DEV);
        if (member.roles.cache.has(Bun.env.DISCORD_ROLE_ADMIN!))
            return this.#addCache(userId, DiscordRankStatus.RANK_ADMIN);

        return this.#addCache(userId, DiscordRankStatus.NO_RANK);
    }
}

const globalForDiscordBot = globalThis as unknown as {
    discordBot?: DiscordBot;
};

export const discordBot = globalForDiscordBot.discordBot ?? new DiscordBot();
globalForDiscordBot.discordBot = discordBot;