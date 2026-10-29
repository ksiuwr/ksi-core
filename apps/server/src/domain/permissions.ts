import { permissionKeys, type Permission } from 'shared/permissions';
export { permissions, permissionKeys, type Permission } from 'shared/permissions';
export type Role = 'member' | 'board' | 'administrator';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'deleted';
export interface Principal {
  id: string;
  role: Role;
  membershipStatus: MembershipStatus;
  flags: string[];
}
const memberDefaults: Permission[] = permissionKeys.filter(
  (p) =>
    p.startsWith('users.profile.') ||
    [
      'projects.membership.join',
      'articles.content.propose',
      'articles.authors.manage-credit',
      'docs.pages.propose',
      'collaboration.items.contribute',
      'files.objects.upload'
    ].includes(p)
);
const boardDefaults: Permission[] = [
  ...memberDefaults,
  'users.membership.activate',
  'projects.catalog.create',
  'projects.catalog.edit',
  'projects.membership.manage',
  'projects.layout.edit',
  'articles.content.publish',
  'docs.pages.review',
  'docs.pages.publish',
  'collaboration.items.restore',
  'collaboration.threads.restrict',
  'audit.events.read',
  'association.alerts.manage'
];
export function matches(pattern: string, permission: string): boolean {
  return pattern.endsWith('*')
    ? permission.startsWith(pattern.slice(0, -1))
    : pattern === permission;
}
export function validateFlags(flags: string[]): void {
  if (flags.length > 100) throw new Error('Too many permission flags');
  for (const flag of flags) {
    const pattern = flag.replace(/^[+-]/, '');
    if (!/^[a-z][a-z0-9.-]*\*?$/.test(pattern) || !permissionKeys.some((p) => matches(pattern, p)))
      throw new Error(`Unknown permission flag: ${flag}`);
  }
}
export function effectivePermissions(user: Principal): Set<Permission> {
  if (user.membershipStatus !== 'active') return new Set();
  const defaults =
    user.role === 'administrator'
      ? permissionKeys
      : user.role === 'board'
        ? boardDefaults
        : memberDefaults;
  const result = new Set<Permission>(defaults);
  for (const flag of user.flags.filter((f) => !f.startsWith('-'))) {
    for (const p of permissionKeys) if (matches(flag.replace(/^\+/, ''), p)) result.add(p);
  }
  for (const flag of user.flags.filter((f) => f.startsWith('-'))) {
    for (const p of result) if (matches(flag.slice(1), p)) result.delete(p);
  }
  return result;
}
export interface ResourceScope {
  memberIds: string[];
  leaderIds: string[];
  association?: boolean;
}
export function canContribute(user: Principal, scope: ResourceScope): boolean {
  return (
    effectivePermissions(user).has('collaboration.items.contribute') &&
    (scope.association === true || user.role !== 'member' || scope.memberIds.includes(user.id))
  );
}
export function canLead(user: Principal, scope: ResourceScope): boolean {
  return (
    user.membershipStatus === 'active' &&
    (user.role !== 'member' || scope.leaderIds.includes(user.id))
  );
}
export function canReadThread(
  user: Principal,
  scope: ResourceScope,
  visibility: 'association' | 'members' | 'leaders',
  invitedIds: string[] = []
): boolean {
  if (user.membershipStatus !== 'active') return false;
  if (user.role !== 'member' || visibility === 'association') return true;
  if (visibility === 'members')
    return scope.association === true || scope.memberIds.includes(user.id);
  return scope.leaderIds.includes(user.id) || invitedIds.includes(user.id);
}
