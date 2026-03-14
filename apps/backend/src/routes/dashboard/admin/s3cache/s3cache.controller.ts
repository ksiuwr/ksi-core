import { createElysia } from '@ksi-core/backend/lib/createElysia';
import { S3Provider } from '@ksi-core/backend/lib/s3cache';
import { status } from 'elysia';

export default createElysia({
	prefix: '/s3cache',
	protectedRoute: true
})
	.use(S3Provider)
	.get('/', async ({ s3 }) => {
		return s3.getCachedMapToObject();
	})
	.post('/:id', async ({ params: { id }, s3 }) => {
		await s3.refetch(id);
		return status(200);
	});
