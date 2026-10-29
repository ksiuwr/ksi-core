import type { ContentTranslations } from './content-locales';
export interface Profile {
  translations?: ContentTranslations;
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  nickname: string | null;
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  membershipStatus: 'pending' | 'active' | 'suspended' | 'deleted';
  role: 'member' | 'board' | 'administrator';
  flags: string[];
  publicPrivacy: 'full-name' | 'last-initial' | 'initials';
}

export interface AssociationAlert {
  translations: ContentTranslations;
  version: number;
  id: string;
  title: string;
  description: string;
  color: 'info' | 'danger' | 'warning' | 'neutral';
  link: string | null;
  priority: number | null;
  startDate: string;
  endDate: string;
}
