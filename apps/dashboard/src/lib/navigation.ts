export type Workspace = 'directory' | 'project' | 'association';
const viewPaths: Record<string, string> = {
  board: 'kanban',
  forum: 'forum',
  articles: 'articles',
  events: 'activity',
  roster: 'members',
  settings: 'settings',
  permissions: 'permissions',
  previews: 'previews'
};
export function parseDashboardPath(pathname: string): {
  workspace: Workspace;
  projectSlug: string;
  tab: string;
  graveyard?: boolean;
  memberId?: string;
  threadId?: string;
  articleSlug?: string;
} | null {
  let segments: string[];
  try {
    segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  const [root, slug, view] = segments;
  if (
    root === 'articles' &&
    slug &&
    segments.length === 2 &&
    !slug.includes('/') &&
    !slug.includes('\\')
  )
    return { workspace: 'directory', projectSlug: '', tab: 'articles', articleSlug: slug };
  if (
    root === 'settings' &&
    (segments.length === 1 || (slug === 'notifications' && segments.length === 2))
  )
    return { workspace: 'directory', projectSlug: '', tab: 'user-settings' };
  const removed = root === 'association' ? segments[2] : segments[3];
  if (
    removed &&
    !(
      (removed === 'graveyard' && (root === 'association' ? slug : view) === 'kanban') ||
      (root === 'association' ? slug : view) === 'forum'
    )
  )
    return null;
  if (segments.some((part) => part.includes('/') || part.includes('\\')) || segments.length > 4)
    return null;
  if (root === 'people' && slug && segments.length === 2)
    return { workspace: 'directory', projectSlug: '', tab: 'person', memberId: slug };
  if (root === 'members' && slug && segments.length === 2)
    return { workspace: 'directory', projectSlug: '', tab: 'users', memberId: slug };
  if ((root === 'profile' || root === 'members' || root === 'inbox') && segments.length === 1)
    return {
      workspace: 'directory',
      projectSlug: '',
      tab: root === 'members' ? 'users' : root
    };
  if (root === 'projects' && segments.length === 1)
    return { workspace: 'directory', projectSlug: '', tab: 'projects' };
  if (root === 'projects' && slug === 'new' && segments.length === 2)
    return { workspace: 'directory', projectSlug: '', tab: '__create_project__' };
  const section = root === 'association' ? slug : view;
  const tab = section
    ? Object.entries(viewPaths).find(([, path]) => path === section)?.[0]
    : 'overview';
  if (
    !tab ||
    (root === 'association' && (tab === 'settings' || tab === 'permissions')) ||
    (root === 'association' && segments.length > 3) ||
    (root !== 'association' && (root !== 'projects' || !slug || slug === 'new'))
  )
    return null;
  return {
    workspace: root === 'association' ? 'association' : 'project',
    projectSlug: root === 'association' ? '' : slug,
    tab,
    ...(removed && section === 'kanban' ? { graveyard: true } : {}),
    ...(removed && section === 'forum' ? { threadId: removed } : {})
  };
}
export function dashboardPath(workspace: Workspace, projectSlug: string, tab: string): string {
  if (tab === 'user-settings') return '/settings';
  if (tab === 'profile') return '/profile';
  if (tab === 'inbox') return '/inbox';
  if (tab === 'users') return '/members';
  if (tab === '__create_project__') return '/projects/new';
  if (tab === 'projects' || workspace === 'directory') return '/projects';
  const base =
    workspace === 'project' ? `/projects/${encodeURIComponent(projectSlug)}` : '/association';
  return tab === 'overview' ? base : `${base}/${viewPaths[tab]}`;
}
