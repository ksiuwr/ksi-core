import { createElysia } from '@ksi-core/backend/lib/createElysia';
import { S3Provider } from '@ksi-core/backend/lib/s3cache';
import { status } from 'elysia';

export default createElysia({ prefix: '/gallery' })
	.use(S3Provider)
	.get('/:id', async ({ params: { id }, s3 }) => {
		const data = await s3.get_key(id);
		if (typeof data === 'number') throw status(data);

		return { images: data };
	});
