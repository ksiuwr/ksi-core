import { error } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';
import type { Profile } from 'shared/types';
import { emptyProjectAccess, type Project, type ProjectAccess, type Workspace } from '../types';
import { getProjectAccess } from './platform';
import { dashboardPath } from '../navigation';

export type WorkspaceContext = {
  workspace: Workspace;
  project: Project | null;
  projectAccess: ProjectAccess;
};

export async function resolveProjectContext(event: ServerLoadEvent): Promise<WorkspaceContext> {
  const { projects } = await event.parent();
  const slug = event.params.slug;
  const project = (projects as Project[] | undefined)?.find((item) => item.slug === slug);
  if (!project) error(404, 'Project not found');
  const projectAccess = await getProjectAccess(event, project.id);
  return { workspace: 'project', project, projectAccess };
}

export function associationContext(): WorkspaceContext {
  return { workspace: 'association', project: null, projectAccess: emptyProjectAccess };
}

export function workspaceId(context: WorkspaceContext): string | null {
  return context.project?.id ?? null;
}

export function projectSlug(context: WorkspaceContext): string {
  return context.project?.slug ?? '';
}

export function scopePath(context: WorkspaceContext, tab = 'overview'): string {
  return dashboardPath(context.workspace, projectSlug(context), tab);
}

export function canManageWorkspace(context: WorkspaceContext, user: Profile): boolean {
  const leader =
    context.workspace === 'project' ? context.projectAccess.canEdit : user.role !== 'member';
  return (
    leader &&
    !user.flags.some((flag) => {
      if (!flag.startsWith('-')) return false;
      const pattern = flag.slice(1);
      return pattern.endsWith('*')
        ? 'projects.catalog.edit'.startsWith(pattern.slice(0, -1))
        : pattern === 'projects.catalog.edit';
    })
  );
}

export function canCreateArticle(context: WorkspaceContext): boolean {
  return context.workspace !== 'project' || context.projectAccess.canProposeArticles;
}

export function canEditArticle(context: WorkspaceContext, user: Profile): boolean {
  return context.workspace === 'project'
    ? context.projectAccess.canEditAnyArticles || context.projectAccess.canProposeArticles
    : user.role !== 'member';
}

export function canSaveArticle(context: WorkspaceContext, user: Profile): boolean {
  return context.workspace === 'project'
    ? context.projectAccess.canEditAnyArticles
    : user.role !== 'member';
}

export function canPublishArticle(context: WorkspaceContext, user: Profile): boolean {
  return context.workspace === 'project'
    ? context.projectAccess.canPublishArticles
    : user.role !== 'member';
}
