import { ListObjectsV2Command, S3 } from '@aws-sdk/client-s3';
import Elysia, { status } from 'elysia';

// TODO: This is temporary, uploading files to R2 storage should be in the dashboard, just like managing this list of known prefixes.
const isAllowedPrefix = (prefix: string) => {
	if (prefix.startsWith('zosia-')) return true;
	if (prefix.startsWith('project-')) return true;

	return false;
};

const s3 = new S3({
	region: 'auto',
	endpoint: Bun.env.R2_ENDPOINT!,
	credentials: {
		accessKeyId: Bun.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY!
	},
	forcePathStyle: true
});

class S3Cache {
	#map: Map<string, { time: number; data: string[] }> = new Map();

	async get_key(key: string) {
		if (!isAllowedPrefix(key)) throw 403;

		if (this.#map.has(key)) return this.#map.get(key)?.data ?? [];

		try {
			await this.#fetch(key);

			return this.#map.get(key)?.data ?? [];
		} catch (e) {
			throw e;
		}
	}

	async refetch(key: string) {
		this.#map.delete(key);
		await this.#fetch(key);
	}

	getCachedMapToObject() {
		return Object.fromEntries(this.#map.entries());
	}

	async #fetch(key: string) {
		try {
			const command = new ListObjectsV2Command({
				Bucket: Bun.env.R2_BUCKET_NAME!,
				Prefix: key
			});

			const response = await s3.send(command);

			const imageUrls =
				response.Contents?.filter((file) => (file.Size ?? 0) > 0).map(
					(file) => `${Bun.env.R2_PUB_ENDPOINT}/${file.Key}`
				) || [];

			this.#map.set(key, { time: new Date().getTime(), data: imageUrls });
		} catch (e) {
			console.error(e);
			throw 500;
		}
	}
}

export const S3Provider = new Elysia({
	name: 'services:s3'
}).decorate(() => ({
	s3: new S3Cache()
}));
