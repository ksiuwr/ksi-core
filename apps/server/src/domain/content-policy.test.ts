import { describe, expect, test } from 'bun:test';
import {
  hasScopedLeadership,
  canEditScope,
  validLabels,
  safeLink,
  safeAlertLink
} from './content-policy';
import { canReadThread, type Principal } from './permissions';
import { assertRevision, visibleMemberIds, visibleSections, validateLayout } from './projects';
const member: Principal = { id: 'anna', role: 'member', membershipStatus: 'active', flags: [] };
const scope = { memberIds: ['anna', 'jan'], leaderIds: ['anna'] };
describe('scoped leadership', () => {
  test('project leaders gain publishing and layout rights only in their project', () => {
    expect(hasScopedLeadership(member, scope, 'articles.content.publish')).toBe(true);
    expect(
      hasScopedLeadership(
        member,
        { memberIds: ['anna'], leaderIds: ['jan'] },
        'articles.content.publish'
      )
    ).toBe(false);
    expect(
      hasScopedLeadership(
        member,
        { memberIds: [], leaderIds: [], association: true },
        'articles.content.publish'
      )
    ).toBe(false);
  });
  test('explicit administrator denials apply even to leaders and elevated roles', () => {
    expect(
      hasScopedLeadership(
        { ...member, flags: ['-articles.content.*'] },
        scope,
        'articles.content.publish'
      )
    ).toBe(false);
    expect(
      hasScopedLeadership(
        { ...member, role: 'administrator', flags: ['-projects.layout.edit'] },
        scope,
        'projects.layout.edit'
      )
    ).toBe(false);
  });
  test('positive grants never bypass project scope or member status', () => {
    expect(
      hasScopedLeadership(
        { ...member, flags: ['+articles.content.publish'] },
        { memberIds: [], leaderIds: [] },
        'articles.content.publish'
      )
    ).toBe(false);
    for (const membershipStatus of ['pending', 'suspended', 'deleted'] as const)
      expect(
        hasScopedLeadership(
          { ...member, membershipStatus, role: 'administrator' },
          scope,
          'articles.content.publish'
        )
      ).toBe(false);
  });
  test('proposals require capability and membership', () => {
    expect(canEditScope(member, scope, 'articles.content.propose')).toBe(true);
    expect(canEditScope(member, { memberIds: [], leaderIds: [] }, 'articles.content.propose')).toBe(
      false
    );
    expect(
      canEditScope(
        { ...member, flags: ['-articles.content.propose'] },
        scope,
        'articles.content.propose'
      )
    ).toBe(false);
  });
});
describe('restricted collaboration', () => {
  test('ordinary project discussions readable to active nonmembers, restricted discussions are not', () => {
    const outsider = { ...member, id: 'outsider' };
    expect(canReadThread(outsider, scope, 'association')).toBe(true);
    expect(canReadThread(outsider, scope, 'members')).toBe(false);
    expect(canReadThread(outsider, scope, 'leaders')).toBe(false);
    expect(canReadThread(outsider, scope, 'leaders', ['outsider'])).toBe(true);
    expect(
      canReadThread({ ...outsider, membershipStatus: 'suspended' }, scope, 'leaders', ['outsider'])
    ).toBe(false);
  });
  test('label vocabulary belongs to its board and cannot contain duplicates', () => {
    expect(validLabels(['Research'], ['Research', 'Engineering'])).toBe(true);
    expect(validLabels(['Community'], ['Research'])).toBe(false);
    expect(validLabels(['Research', 'Research'], ['Research'])).toBe(false);
  });
});
describe('content invariants', () => {
  test('proposal base revision cannot silently overwrite newer work', () => {
    expect(() => assertRevision(2, 3)).toThrow('REVISION_CONFLICT');
    expect(() => assertRevision(3, 3)).not.toThrow();
  });
  test('hidden and empty sections omitted; shown leaders not duplicated as members', () => {
    expect(
      visibleSections(
        [
          { type: 'leaders', hidden: false },
          { type: 'members', hidden: false },
          { type: 'links', hidden: true }
        ],
        { leaders: 1, members: 0, links: 1, articles: 0, 'main-article': 0 }
      )
    ).toEqual(['leaders']);
    expect(visibleMemberIds(['anna', 'jan', 'jan'], ['anna'], true)).toEqual(['jan']);
    expect(visibleMemberIds(['anna', 'jan'], ['anna'], false)).toEqual(['anna', 'jan']);
    expect(() =>
      validateLayout([
        { type: 'leaders', hidden: true },
        { type: 'leaders', hidden: false }
      ])
    ).toThrow();
  });
  test('project links reject executable protocols', () => {
    expect(safeLink('https://github.com/ksiuwr/krasnal')).toBe(true);
    expect(safeLink('javascript:alert(1)')).toBe(false);
    expect(safeLink('data:text/html,test')).toBe(false);
    expect(safeLink('/relative')).toBe(false);
  });
  test('alert links reject executable protocols', () => {
    for (const link of ['', '/projects', 'https://ksi.edu.pl/zosia', 'mailto:board@ksi.edu.pl'])
      expect(safeAlertLink(link)).toBe(true);
    for (const link of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)'])
      expect(safeAlertLink(link)).toBe(false);
    expect(safeAlertLink('data:text/html,test')).toBe(false);
  });
});
