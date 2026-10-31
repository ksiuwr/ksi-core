import { describe, expect, test } from 'bun:test';
import {
  docFolderDescendants,
  docFolderOptions,
  docFolderPath,
  docFolderTrail,
  type DocFolder
} from './doc-folders';

const folders: DocFolder[] = [
  { id: 'camp', parentId: null, name: 'Obóz', translations: { en: { name: 'Camp' } } },
  { id: 'kit', parentId: 'camp', name: 'Sprzęt', translations: { en: { name: 'Kit' } } },
  { id: 'empty', parentId: 'kit', name: 'Pusty', translations: {} },
  { id: 'other', parentId: null, name: 'Archiwum', translations: {} }
];

describe('documentation folder identities', () => {
  test('paths localize each ancestor with per-name fallback', () => {
    expect(docFolderPath(folders, 'empty', 'en-us')).toBe('Camp/Kit/Pusty');
    expect(docFolderPath(folders, 'empty', 'pl')).toBe('Obóz/Sprzęt/Pusty');
    expect(docFolderPath(folders, 'empty')).toBe('Obóz/Sprzęt/Pusty');
    expect(docFolderPath(folders, null, 'en')).toBe('');
    expect(docFolderTrail(folders, 'kit', 'en')).toEqual([
      { id: 'camp', name: 'Camp' },
      { id: 'kit', name: 'Kit' }
    ]);
  });
  test('descendants prevent moving a folder into any level of its own subtree', () => {
    expect([...docFolderDescendants(folders, 'camp')].sort()).toEqual(['camp', 'empty', 'kit']);
    expect([...docFolderDescendants(folders, 'kit')].sort()).toEqual(['empty', 'kit']);
  });
  test('choices keep stable ids and nested depth, sorted by localized name', () => {
    expect(docFolderOptions(folders, 'en')).toEqual([
      { id: 'other', label: 'Archiwum', depth: 0 },
      { id: 'camp', label: 'Camp', depth: 0 },
      { id: 'kit', label: 'Kit', depth: 1 },
      { id: 'empty', label: 'Pusty', depth: 2 }
    ]);
  });
});
