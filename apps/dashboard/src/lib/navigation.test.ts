/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { dashboardPath, parseDashboardPath } from './navigation';
describe('dashboard routes', () => {
  test('project tools keep the same project after a refresh', () => {
    for (const tab of [
      'overview',
      'board',
      'forum',
      'articles',
      'events',
      'roster',
      'settings',
      'permissions'
    ]) {
      const path = dashboardPath('project', 'roboty ksi', tab);
      expect(parseDashboardPath(path)).toEqual({
        workspace: 'project',
        projectSlug: 'roboty ksi',
        tab
      });
    }
  });
  test('association and global pages are explicit workspaces', () => {
    expect(parseDashboardPath('/association/kanban')).toEqual({
      workspace: 'association',
      projectSlug: '',
      tab: 'board'
    });
    expect(parseDashboardPath('/projects')).toEqual({
      workspace: 'directory',
      projectSlug: '',
      tab: 'projects'
    });
    expect(dashboardPath('project', 'roboty', 'profile')).toBe('/profile');
    expect(parseDashboardPath('/inbox')).toEqual({
      workspace: 'directory',
      projectSlug: '',
      tab: 'inbox'
    });
    expect(dashboardPath('project', 'roboty', 'inbox')).toBe('/inbox');
    expect(parseDashboardPath('/projects/new')?.tab).toBe('__create_project__');
  });
  test('removed task routes retain their board scope on refresh', () => {
    expect(parseDashboardPath('/projects/roboty/kanban/graveyard')).toEqual({
      workspace: 'project',
      projectSlug: 'roboty',
      tab: 'board',
      graveyard: true
    });
    expect(parseDashboardPath('/association/kanban/graveyard')).toEqual({
      workspace: 'association',
      projectSlug: '',
      tab: 'board',
      graveyard: true
    });
    expect(parseDashboardPath('/projects/roboty/articles/graveyard')).toBeNull();
    expect(parseDashboardPath('/association/kanban/graveyard/extra')).toBeNull();
  });
  test('rejects unknown tools, malformed URLs and encoded path separators', () => {
    for (const path of [
      '/kanban',
      '/projects/a/nope',
      '/association/a/forum',
      '/profile/edit',
      '/projects/new/kanban',
      '/projects/%',
      '/projects/a%2Fb/kanban'
    ])
      expect(parseDashboardPath(path)).toBeNull();
  });
});

test('member detail URLs preserve the selected person', () => {
  expect(parseDashboardPath('/members/abc123')).toEqual({
    workspace: 'directory',
    projectSlug: '',
    tab: 'users',
    memberId: 'abc123'
  });
});

test('forum threads have persistent project and association paths', () => {
  expect(parseDashboardPath('/projects/roboty/forum/abc')).toEqual({
    workspace: 'project',
    projectSlug: 'roboty',
    tab: 'forum',
    threadId: 'abc'
  });
  expect(parseDashboardPath('/association/forum/abc')).toEqual({
    workspace: 'association',
    projectSlug: '',
    tab: 'forum',
    threadId: 'abc'
  });
  expect(parseDashboardPath('/projects/roboty/forum/abc/extra')).toBeNull();
});

test('workspace member and project settings paths are persistent', () => {
  expect(parseDashboardPath('/association/members')?.tab).toBe('roster');
  expect(parseDashboardPath('/projects/roboty/members')?.tab).toBe('roster');
  expect(parseDashboardPath('/projects/roboty/settings')?.tab).toBe('settings');
  expect(parseDashboardPath('/association/settings')).toBeNull();
  expect(parseDashboardPath('/people/abc')?.memberId).toBe('abc');
});

test('article slugs persist in standalone routes and reject malformed segments', () => {
  expect(parseDashboardPath('/articles/project-introduction')).toEqual({
    workspace: 'directory',
    projectSlug: '',
    tab: 'articles',
    articleSlug: 'project-introduction'
  });
  expect(parseDashboardPath('/articles/a%2Fb')).toBeNull();
  expect(parseDashboardPath('/articles/a/extra')).toBeNull();
});
