import type { Profile } from 'shared/types';
import type { PageInbox, Project, ProjectAccess } from '$lib/types';
declare global {
  namespace App {
    interface Locals {
      user: Profile | null;
    }
    interface PageData {
      user: Profile | null;
      projects: Project[];
      inbox: PageInbox;
      project: Project | null;
      projectAccess: ProjectAccess;
      title?: string;
      tab?: string;
      articleProject?: Project | null;
      [key: string]: unknown;
    }
  }
}
export {};
