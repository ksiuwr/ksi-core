import { describe, expect, test } from 'bun:test';
import {
  validBoardLabels,
  normalizeBoardLabel,
  boardLabelNames,
  DEFAULT_LABEL_COLOR,
  type BoardLabel
} from './board-labels';

describe('board labels domain', () => {
  test('normalizes string labels and preserves colors and descriptions', () => {
    expect(normalizeBoardLabel('bug')).toEqual({ name: 'bug', color: DEFAULT_LABEL_COLOR });
    expect(
      normalizeBoardLabel({ name: 'feature', color: '#10B981', description: 'New functionality' })
    ).toEqual({ name: 'feature', color: '#10b981', description: 'New functionality' });
    expect(normalizeBoardLabel({ name: 'docs', color: 'invalid-color' })).toEqual({
      name: 'docs',
      color: DEFAULT_LABEL_COLOR,
      description: undefined
    });
  });

  test('validates board labels uniqueness and constraints', () => {
    const valid: BoardLabel[] = [
      { name: 'bug', color: '#ef4444', description: 'Something is broken' },
      { name: 'enhancement', color: '#3b82f6' }
    ];
    expect(validBoardLabels(valid)).toBe(true);
    expect(validBoardLabels(['bug', 'enhancement'])).toBe(true);

    // duplicate case-insensitive
    expect(validBoardLabels([{ name: 'Bug' }, { name: 'bug' }])).toBe(false);

    // invalid color
    expect(validBoardLabels([{ name: 'bug', color: 'red' }])).toBe(false);
    expect(validBoardLabels([{ name: 'bug', color: '#12345' }])).toBe(false);

    // empty or whitespace-only name
    expect(validBoardLabels([{ name: '' }])).toBe(false);
    expect(validBoardLabels([{ name: '   ' }])).toBe(false);

    // description length limit
    expect(validBoardLabels([{ name: 'bug', description: 'a'.repeat(201) }])).toBe(false);
    expect(validBoardLabels([{ name: 'bug', description: 'a'.repeat(200) }])).toBe(true);
  });

  test('extracts label names consistently', () => {
    expect(boardLabelNames(['a', { name: 'b', color: '#fff' }])).toEqual(['a', 'b']);
  });
});
