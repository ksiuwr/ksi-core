import { describe, expect, test } from 'bun:test';
import {
  publicDocNeighbors,
  publicDocPages,
  publicDocPath,
  publicDocWorkspaces,
  type PublicDocSummary
} from './public-docs';

const page = (
  slug: string,
  title: string,
  projectSlug: string | null,
  projectName: string | null,
  folderTrail: PublicDocSummary['folderTrail'] = []
): PublicDocSummary => ({
  slug,
  title,
  projectSlug,
  projectName,
  folderTrail,
  folder: folderTrail.map((folder) => folder.name).join('/'),
  excerpt: '',
  updatedAt: '2026-10-30T00:00:00Z'
});

describe('public documentation navigation', () => {
  test('keeps same-slug files separate by workspace and builds nested folders by identity', () => {
    const pages = [
      page('guide', 'ZOSIA guide', 'zosia', 'ZOSIA', [
        { id: 'camp', name: 'Camp' },
        { id: 'travel', name: 'Travel' }
      ]),
      page('guide', 'Association guide', null, null),
      page('packing', 'Bus packing', 'zosia', 'ZOSIA', [
        { id: 'camp', name: 'Camp' },
        { id: 'kit', name: 'Equipment' }
      ]),
      page('about', 'About research', 'research', 'Research')
    ];
    const tree = publicDocWorkspaces(pages, 'en');
    expect(tree.map((workspace) => workspace.slug)).toEqual(['association', 'research', 'zosia']);
    expect(tree[0]!.pages.map((doc) => doc.title)).toEqual(['Association guide']);
    const camp = tree[2]!.folders[0]!;
    expect(camp.folders.map((folder) => folder.name)).toEqual(['Equipment', 'Travel']);
    expect(camp.folders[1]!.pages[0]!.title).toBe('ZOSIA guide');
    expect(tree[2]!.pages).toEqual([]);
    expect(pages.map((doc) => doc.slug)).toEqual(['guide', 'guide', 'packing', 'about']);
  });
  test('does not collapse distinct folders that happen to have the same translated name', () => {
    const tree = publicDocWorkspaces(
      [
        page('one', 'Pierwsza strona', 'camp', 'Obóz', [{ id: 'a', name: 'Materiały' }]),
        page('two', 'Druga strona', 'camp', 'Obóz', [{ id: 'b', name: 'Materiały' }])
      ],
      'pl'
    );
    expect(tree[0]!.folders).toHaveLength(2);
    expect(tree[0]!.folders.map((folder) => folder.pages[0]!.slug)).toEqual(['one', 'two']);
  });
  test('an empty public index does not invent workspaces or folders', () => {
    expect(publicDocWorkspaces([])).toEqual([]);
  });
  test('reads a workspace level by level, with pages before their sibling folders', () => {
    const camp = { id: 'camp', name: 'Camp' };
    const tree = publicDocWorkspaces(
      [
        page('packing', 'Packing', 'zosia', 'ZOSIA', [camp, { id: 'kit', name: 'Kit' }]),
        page('schedule', 'Schedule', 'zosia', 'ZOSIA', [camp]),
        page('intro', 'Intro', 'zosia', 'ZOSIA')
      ],
      'en'
    );
    expect(publicDocPages(tree[0]!).map((doc) => doc.slug)).toEqual([
      'intro',
      'schedule',
      'packing'
    ]);
  });
  test('neighbors stay inside the workspace and stop at its ends', () => {
    const pages = [
      page('intro', 'Intro', 'zosia', 'ZOSIA'),
      page('packing', 'Packing', 'zosia', 'ZOSIA'),
      page('intro', 'Association intro', null, null)
    ];
    const neighbors = (workspace: string, slug: string) => {
      const { previous, next } = publicDocNeighbors(pages, workspace, slug, 'en');
      return [previous?.slug, next?.slug];
    };
    expect(neighbors('zosia', 'intro')).toEqual([undefined, 'packing']);
    expect(neighbors('zosia', 'packing')).toEqual(['intro', undefined]);
    expect(neighbors('association', 'intro')).toEqual([undefined, undefined]);
    expect(neighbors('zosia', 'missing')).toEqual([undefined, undefined]);
    expect(neighbors('missing', 'intro')).toEqual([undefined, undefined]);
  });
  test('page links keep the workspace and page as separate encoded segments', () => {
    expect(publicDocPath('association', 'faq')).toBe('/docs/association/faq');
    expect(publicDocPath('camp/name', 'guide#section')).toBe('/docs/camp%2Fname/guide%23section');
  });
});
