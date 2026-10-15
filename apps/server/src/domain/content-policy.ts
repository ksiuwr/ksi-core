import {
  canLead,
  canContribute,
  effectivePermissions,
  matches,
  type Permission,
  type Principal,
  type ResourceScope
} from './permissions';
/** Leadership supplies scoped powers, but never overrides an explicit administrator denial. */
export function hasScopedLeadership(
  user: Principal,
  scope: ResourceScope,
  permission: Permission
): boolean {
  return (
    canLead(user, scope) &&
    !user.flags.some((flag) => flag.startsWith('-') && matches(flag.slice(1), permission))
  );
}
export function canEditScope(
  user: Principal,
  scope: ResourceScope,
  permission: Permission
): boolean {
  return effectivePermissions(user).has(permission) && canContribute(user, scope);
}
export function validTags(tags: string[], boardTags: string[]): boolean {
  return tags.every((tag) => boardTags.includes(tag)) && new Set(tags).size === tags.length;
}
export function safeLink(url: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
// Alert links may be relative to the site, but must not run script or open data URLs when clicked.
export function safeAlertLink(url: string): boolean {
  const base = 'https://ksi.edu.pl';
  return (
    URL.canParse(url, base) && ['https:', 'http:', 'mailto:'].includes(new URL(url, base).protocol)
  );
}
