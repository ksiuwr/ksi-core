import { error } from '@sveltejs/kit';
import { editions } from '$lib/data/conferences';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  const edition = editions[params.year];

  if (!edition) {
    error(404, `ZOSIA edition ${params.year} was not found`);
  }

  return {
    year: params.year,
    edition
  };
};
