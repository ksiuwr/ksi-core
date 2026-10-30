import { describe, expect, test } from 'bun:test';
import {
  docFolderDescendants,
  docFolderOptions,
  docFolderPath,
  docFolderTrail,
  type DocFolder
} from './doc-folders';

const folders: DocFolder[] = [
  { id: 'camp', parentId: null, name: 'Camp', translations: { pl: { name: 'Obóz' } } },
  { id: 'kit', parentId: 'camp', name: 'Kit', translations: { pl: { name: 'Sprzęt' } } },
  { id: 'empty', parentId: 'kit', name: 'Empty', translations: {} },
  { id: 'other', parentId: null, name: 'Archive', translations: {} }
];

describe('documentation folder identities', () => {
  test('paths localize each ancestor with per-name fallback', () => {
    expect(docFolderPath(folders, 'empty', 'pl')).toBe('Obóz/Sprzęt/Empty');
    expect(docFolderPath(folders, 'empty', 'en')).toBe('Camp/Kit/Empty');
    expect(docFolderPath(folders, null, 'pl')).toBe('');
    expect(docFolderTrail(folders, 'kit', 'pl')).toEqual([
      { id: 'camp', name: 'Obóz' },
      { id: 'kit', name: 'Sprzęt' }
    ]);
  });
  test('descendants prevent moving a folder into any level of its own subtree', () => {
    expect([...docFolderDescendants(folders, 'camp')].sort()).toEqual(['camp', 'empty', 'kit']);
    expect([...docFolderDescendants(folders, 'kit')].sort()).toEqual(['empty', 'kit']);
  });
  test('choices keep stable ids and nested depth, sorted by localized name', () => {
    expect(docFolderOptions(folders, 'pl')).toEqual([
      { id: 'other', label: 'Archive', depth: 0 },
      { id: 'camp', label: 'Obóz', depth: 0 },
      { id: 'kit', label: 'Sprzęt', depth: 1 },
      { id: 'empty', label: 'Empty', depth: 2 }
    ]);
  });
});
