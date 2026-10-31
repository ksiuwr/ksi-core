/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { folderTree, languagesOf, textIn, type DocSummary, type DocText } from './docs';

function page(id: string, title: string, folderId: string | null = null): DocSummary {
  return {
    id,
    slug: id,
    title,
    folder: 'Old name deliberately unrelated to membership',
    folderId,
    public: false,
    version: 1,
    createdAt: '2026-10-29T12:00:00Z',
    updatedAt: '2026-10-29T12:00:00Z',
    excerpt: '',
    contributors: []
  };
}

const polish: DocText = {
  folder: 'Obóz/Logistyka',
  title: 'Pakowanie autobusu',
  markdown: '## Sprzęt\n\n- [ ] Przedłużacze',
  translations: {}
};

describe('documentation folders', () => {
  test('builds a localized tree by identity including empty folders and distinct same-name children', () => {
    const folders = [
      { id: 'camp', parentId: null, name: 'Obóz', translations: { en: { name: 'Camp' } } },
      {
        id: 'logistics',
        parentId: 'camp',
        name: 'Logistyka',
        translations: { en: { name: 'Logistics' } }
      },
      { id: 'association', parentId: null, name: 'Stowarzyszenie', translations: {} },
      { id: 'other-logistics', parentId: 'association', name: 'Logistyka', translations: {} },
      { id: 'empty', parentId: 'logistics', name: 'Pusty', translations: {} }
    ];
    const pages = [
      page('bus', 'Packing', 'logistics'),
      page('welcome', 'Welcome'),
      page('kit', 'Equipment', 'logistics'),
      page('archive', 'Archive', 'other-logistics')
    ];
    const tree = folderTree(pages, folders, 'en');
    expect(tree.pages.map((item) => item.id)).toEqual(['welcome']);
    expect(tree.folders.map((item) => item.name)).toEqual(['Camp', 'Stowarzyszenie']);
    const camp = tree.folders.find((item) => item.id === 'camp')!;
    expect(camp.folders[0]!.path).toBe('Camp/Logistics');
    expect(camp.folders[0]!.pages.map((item) => item.id)).toEqual(['kit', 'bus']);
    expect(camp.folders[0]!.folders[0]!.pages).toEqual([]);
    expect(tree.folders[1]!.folders[0]!.pages.map((item) => item.id)).toEqual(['archive']);
    expect(pages.map((item) => item.id)).toEqual(['bus', 'welcome', 'kit', 'archive']);
    const renamed = folders.map((folder) =>
      folder.id === 'logistics' ? { ...folder, name: 'Sprzęt' } : folder
    );
    expect(
      folderTree(pages, renamed).folders.find((item) => item.id === 'camp')!.folders[0]!.pages
    ).toHaveLength(2);
  });
  test('supports an empty workspace without inventing a visible root folder', () => {
    expect(folderTree([], [])).toEqual({ id: null, name: '', path: '', folders: [], pages: [] });
  });
});

describe('documentation translation editing and review', () => {
  test('keeps absent and removed translated fields empty instead of filling them from Polish', () => {
    const translated: DocText = {
      ...polish,
      translations: { en: { title: 'Packing the bus' } }
    };
    expect(textIn(translated, 'pl')).toEqual({
      title: polish.title,
      markdown: polish.markdown
    });
    expect(textIn(translated, 'en')).toEqual({ title: 'Packing the bus', markdown: '' });
    expect(textIn(polish, 'en')).toEqual({ title: '', markdown: '' });
    expect(textIn(null, 'pl')).toEqual({ title: '', markdown: '' });
    expect(textIn(undefined, 'en')).toEqual({ title: '', markdown: '' });
  });

  test('includes a removed translation in comparison languages and deduplicates shared locales', () => {
    const before: DocText = {
      ...polish,
      translations: { en: { title: 'Packing the bus', markdown: '## Equipment' } }
    };
    expect(languagesOf(before, polish)).toEqual(['pl', 'en']);
    expect(languagesOf(before, before, null, undefined)).toEqual(['pl', 'en']);
    expect(languagesOf(polish)).toEqual(['pl']);
    expect(languagesOf()).toEqual(['pl']);
  });
});
