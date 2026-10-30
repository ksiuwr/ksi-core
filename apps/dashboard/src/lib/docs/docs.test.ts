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

const english: DocText = {
  folder: 'Camp/Logistics',
  title: 'Packing the bus',
  markdown: '## Equipment\n\n- [ ] Extension cords',
  translations: {}
};

describe('documentation folders', () => {
  test('builds a localized tree by identity including empty folders and distinct same-name children', () => {
    const folders = [
      { id: 'camp', parentId: null, name: 'Camp', translations: { pl: { name: 'Obóz' } } },
      {
        id: 'logistics',
        parentId: 'camp',
        name: 'Logistics',
        translations: { pl: { name: 'Logistyka' } }
      },
      { id: 'association', parentId: null, name: 'Association', translations: {} },
      { id: 'other-logistics', parentId: 'association', name: 'Logistics', translations: {} },
      { id: 'empty', parentId: 'logistics', name: 'Empty', translations: {} }
    ];
    const pages = [
      page('bus', 'Packing', 'logistics'),
      page('welcome', 'Welcome'),
      page('kit', 'Equipment', 'logistics'),
      page('archive', 'Archive', 'other-logistics')
    ];
    const tree = folderTree(pages, folders, 'pl');
    expect(tree.pages.map((item) => item.id)).toEqual(['welcome']);
    expect(tree.folders.map((item) => item.name)).toEqual(['Association', 'Obóz']);
    const camp = tree.folders.find((item) => item.id === 'camp')!;
    expect(camp.folders[0]!.path).toBe('Obóz/Logistyka');
    expect(camp.folders[0]!.pages.map((item) => item.id)).toEqual(['kit', 'bus']);
    expect(camp.folders[0]!.folders[0]!.pages).toEqual([]);
    expect(tree.folders[0]!.folders[0]!.pages.map((item) => item.id)).toEqual(['archive']);
    expect(pages.map((item) => item.id)).toEqual(['bus', 'welcome', 'kit', 'archive']);
    const renamed = folders.map((folder) =>
      folder.id === 'logistics' ? { ...folder, name: 'Equipment' } : folder
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
  test('keeps absent and removed translated fields empty instead of filling them from English', () => {
    const translated: DocText = {
      ...english,
      translations: { pl: { title: 'Pakowanie autobusu' } }
    };
    expect(textIn(translated, 'en')).toEqual({
      title: english.title,
      markdown: english.markdown
    });
    expect(textIn(translated, 'pl')).toEqual({ title: 'Pakowanie autobusu', markdown: '' });
    expect(textIn(english, 'pl')).toEqual({ title: '', markdown: '' });
    expect(textIn(null, 'en')).toEqual({ title: '', markdown: '' });
    expect(textIn(undefined, 'pl')).toEqual({ title: '', markdown: '' });
  });

  test('includes a removed translation in comparison languages and deduplicates shared locales', () => {
    const before: DocText = {
      ...english,
      translations: { pl: { title: 'Pakowanie autobusu', markdown: '## Sprzęt' } }
    };
    expect(languagesOf(before, english)).toEqual(['en', 'pl']);
    expect(languagesOf(before, before, null, undefined)).toEqual(['en', 'pl']);
    expect(languagesOf(english)).toEqual(['en']);
    expect(languagesOf()).toEqual(['en']);
  });
});
