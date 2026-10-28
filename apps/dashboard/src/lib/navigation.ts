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

const pathViews: Record<string, string> = Object.fromEntries(
  Object.entries(viewPaths).map(([tab, path]) => [path, tab])
);

export function projectPath(slug: string): string {
  return `/projects/${encodeURIComponent(slug)}`;
}

export function workspacePath(workspace: Workspace, projectSlug: string): string {
  if (workspace === 'project') return projectPath(projectSlug);
  if (workspace === 'association') return '/association';
  return '/projects';
}

export function dashboardPath(workspace: Workspace, projectSlug: string, tab: string): string {
  if (tab === 'user-settings') return '/settings';
  if (tab === 'profile') return '/profile';
  if (tab === 'inbox') return '/inbox';
  if (tab === 'users') return '/members';
  if (tab === 'person') return '/people';
  if (tab === '__create_project__') return '/projects/new';
  if (tab === 'projects' || workspace === 'directory') return '/projects';
  const base = workspacePath(workspace, projectSlug);
  const segment = viewPaths[tab];
  return !segment || tab === 'overview' ? base : `${base}/${segment}`;
}

export function taskPath(workspace: Workspace, projectSlug: string, id: string): string {
  return `${workspacePath(workspace, projectSlug)}/tasks/${encodeURIComponent(id)}`;
}

export function threadPath(workspace: Workspace, projectSlug: string, id: string): string {
  return `${dashboardPath(workspace, projectSlug, 'forum')}/${encodeURIComponent(id)}`;
}

export function articlePath(slug: string): string {
  return `/articles/${encodeURIComponent(slug)}`;
}

/**
 * Resolve the active sidebar tab from a real route pathname. Route params are
 * the source of truth for slugs and ids; this helper only classifies the page.
 */
export function tabFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const [root, second, third, fourth] = segments;
  if (root === 'projects') {
    if (!second) return 'projects';
    if (second === 'new') return '__create_project__';
    return tabFromSegments(third, fourth);
  }
  if (root === 'association') return tabFromSegments(second, third);
  if (root === 'members') return 'users';
  if (root === 'people') return 'person';
  if (root === 'profile') return 'profile';
  if (root === 'inbox') return 'inbox';
  if (root === 'settings') return 'user-settings';
  if (root === 'articles') return 'articles';
  return 'projects';
}

function tabFromSegments(section: string | undefined, detail: string | undefined): string {
  if (!section) return 'overview';
  if (section === 'kanban') return 'board';
  if (section === 'tasks') return 'board';
  if (section === 'forum') return 'forum';
  if (detail && section === 'members') return 'person';
  return pathViews[section] ?? 'overview';
}

/**
 * Legacy parser retained for old bookmarks, redirects, and navigation tests.
 * Application pages read route params directly.
 */
export function parseDashboardPath(pathname: string): {
  workspace: Workspace;
  projectSlug: string;
  tab: string;
  graveyard?: boolean;
  memberId?: string;
  threadId?: string;
  articleSlug?: string;
  taskId?: string;
} | null {
  let segments: string[];
  try {
    segments = pathname
      .split('?')[0]
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
  if (
    !segments.length ||
    segments.some((part) => part.includes('/') || part.includes('\\')) ||
    segments.length > 4
  )
    return null;
  const [root, slug, view, detail] = segments;

  if (root === 'projects') {
    if (segments.length === 1) return { workspace: 'directory', projectSlug: '', tab: 'projects' };
    if (slug === 'new' && segments.length === 2)
      return { workspace: 'directory', projectSlug: '', tab: '__create_project__' };
    if (!slug || slug === 'new') return null;
    if (segments.length === 2) return { workspace: 'project', projectSlug: slug, tab: 'overview' };
    if (view === 'tasks' && segments.length === 4 && detail)
      return { workspace: 'project', projectSlug: slug, tab: 'board', taskId: detail };
    if (view === 'kanban' && segments.length === 4 && detail === 'graveyard')
      return { workspace: 'project', projectSlug: slug, tab: 'board', graveyard: true };
    if (view === 'forum' && segments.length === 4 && detail)
      return { workspace: 'project', projectSlug: slug, tab: 'forum', threadId: detail };
    if (segments.length === 3) {
      const tab = pathViews[view];
      return tab ? { workspace: 'project', projectSlug: slug, tab } : null;
    }
    return null;
  }

  if (root === 'association') {
    if (segments.length === 1)
      return { workspace: 'association', projectSlug: '', tab: 'overview' };
    if (segments.length === 2) {
      if (slug === 'tasks') return { workspace: 'association', projectSlug: '', tab: 'board' };
      const tab = pathViews[slug];
      return tab && !['settings', 'permissions', 'previews'].includes(tab)
        ? { workspace: 'association', projectSlug: '', tab }
        : null;
    }
    if (segments.length === 3 && slug === 'tasks' && view)
      return { workspace: 'association', projectSlug: '', tab: 'board', taskId: view };
    if (segments.length === 3 && slug === 'kanban' && view === 'graveyard')
      return { workspace: 'association', projectSlug: '', tab: 'board', graveyard: true };
    if (segments.length === 3 && slug === 'forum' && view)
      return { workspace: 'association', projectSlug: '', tab: 'forum', threadId: view };
    return null;
  }

  if (root === 'members' && segments.length <= 2)
    return {
      workspace: 'directory',
      projectSlug: '',
      tab: 'users',
      ...(slug ? { memberId: slug } : {})
    };
  if (root === 'people' && segments.length === 2)
    return { workspace: 'directory', projectSlug: '', tab: 'person', memberId: slug };
  if (root === 'profile' && segments.length === 1)
    return { workspace: 'directory', projectSlug: '', tab: 'profile' };
  if (root === 'inbox' && segments.length === 1)
    return { workspace: 'directory', projectSlug: '', tab: 'inbox' };
  if (
    root === 'settings' &&
    (segments.length === 1 || (segments.length === 2 && slug === 'notifications'))
  )
    return { workspace: 'directory', projectSlug: '', tab: 'user-settings' };
  if (root === 'articles' && segments.length === 2 && slug)
    return { workspace: 'directory', projectSlug: '', tab: 'articles', articleSlug: slug };
  return null;
}
