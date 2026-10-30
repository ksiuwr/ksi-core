import { dashboardPath, taskPath, type Workspace } from './navigation';

function scope(projectSlug: string | null): { workspace: Workspace; slug: string } {
  return { workspace: projectSlug ? 'project' : 'association', slug: projectSlug ?? '' };
}

export function linkForMetadata(
  key: string,
  value: unknown,
  projectSlug: string | null
): string | null {
  if (typeof value !== 'string' || !value) return null;
  const { workspace, slug } = scope(projectSlug);
  if (key === 'userId' || key === 'actorId') return `/members/${encodeURIComponent(value)}`;
  if (key === 'threadId')
    return `${dashboardPath(workspace, slug, 'forum')}/${encodeURIComponent(value)}`;
  if (key === 'articleId') return dashboardPath(workspace, slug, 'articles');
  if (key === 'pageId') return dashboardPath(workspace, slug, 'docs');
  if (key === 'projectId')
    return projectSlug ? `/projects/${encodeURIComponent(projectSlug)}` : null;
  if (key === 'itemId') return taskPath(workspace, slug, value);
  if (key === 'boardId') return dashboardPath(workspace, slug, 'board');
  return null;
}

export function linkForAction(
  action: string,
  targetId: string,
  projectSlug: string | null
): string | null {
  const { workspace, slug } = scope(projectSlug);
  if (action.startsWith('articles.')) return dashboardPath(workspace, slug, 'articles');
  if (action.startsWith('docs.proposal.'))
    return `${dashboardPath(workspace, slug, 'docs')}/suggestions/${encodeURIComponent(targetId)}`;
  if (action.startsWith('docs.')) return dashboardPath(workspace, slug, 'docs');
  if (action.startsWith('threads.'))
    return `${dashboardPath(workspace, slug, 'forum')}/${encodeURIComponent(targetId)}`;
  if (action === 'kanban.reordered') return dashboardPath(workspace, slug, 'board');
  if (action.startsWith('kanban.') || action.startsWith('items.'))
    return taskPath(workspace, slug, targetId);
  if (action.startsWith('projects.'))
    return projectSlug ? `/projects/${encodeURIComponent(projectSlug)}` : null;
  return null;
}
