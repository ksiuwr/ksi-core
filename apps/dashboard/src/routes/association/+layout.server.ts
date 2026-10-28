import { associationContext } from '$lib/server/workspace';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => associationContext();
