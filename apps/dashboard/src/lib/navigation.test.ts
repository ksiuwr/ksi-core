/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  dashboardPath,
  parseDashboardPath,
  tabFromPath,
  taskPath,
  threadPath,
  articlePath,
  newTaskPath,
  newThreadPath,
  newArticlePath
} from './navigation';
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
    expect(dashboardPath('project', 'roboty', 'events')).toBe('/projects/roboty/activity');
    expect(parseDashboardPath('/projects/roboty/activity')?.tab).toBe('events');
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

test('task pages use dedicated routes for projects and the association', () => {
  const projectTask = taskPath('project', 'roboty', 'task 1');
  expect(projectTask).toBe('/projects/roboty/tasks/task%201');
  expect(parseDashboardPath(projectTask)).toEqual({
    workspace: 'project',
    projectSlug: 'roboty',
    tab: 'board',
    taskId: 'task 1'
  });
  const associationTask = taskPath('association', '', 'task1');
  expect(associationTask).toBe('/association/tasks/task1');
  expect(parseDashboardPath(associationTask)).toEqual({
    workspace: 'association',
    projectSlug: '',
    tab: 'board',
    taskId: 'task1'
  });
  expect(taskPath('project', 'roboty', 29)).toBe('/projects/roboty/tasks/29');
  expect(parseDashboardPath('/projects/roboty/tasks/29')?.taskId).toBe('29');
  expect(parseDashboardPath('/association/tasks')).toEqual({
    workspace: 'association',
    projectSlug: '',
    tab: 'board'
  });
  expect(parseDashboardPath('/projects/roboty/tasks')).toBeNull();
});

test('creation pages stay inside their workspace', () => {
  expect(newTaskPath('project', 'roboty ksi', 'in progress')).toBe(
    '/projects/roboty%20ksi/tasks/new?status=in%20progress'
  );
  expect(newTaskPath('association', '')).toBe('/association/tasks/new');
  expect(newThreadPath('project', 'roboty')).toBe('/projects/roboty/forum/new');
  expect(newThreadPath('association', '')).toBe('/association/forum/new');
  expect(newArticlePath('project', 'roboty')).toBe('/projects/roboty/articles/new');
  expect(newArticlePath('association', '')).toBe('/association/articles/new');
  expect(tabFromPath('/projects/roboty/tasks/new')).toBe('board');
  expect(tabFromPath('/projects/roboty/forum/new')).toBe('forum');
  expect(tabFromPath('/projects/roboty/articles/new')).toBe('articles');
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
  expect(threadPath('project', 'roboty', 'abc')).toBe('/projects/roboty/forum/abc');
  expect(threadPath('project', 'roboty', 29)).toBe('/projects/roboty/forum/29');
  expect(parseDashboardPath('/projects/roboty/forum/29')?.threadId).toBe('29');
});

test('workspace member and project settings paths are persistent', () => {
  expect(parseDashboardPath('/association/members')?.tab).toBe('roster');
  expect(parseDashboardPath('/projects/roboty/members')?.tab).toBe('roster');
  expect(parseDashboardPath('/projects/roboty/settings')?.tab).toBe('settings');
  expect(parseDashboardPath('/association/settings')).toEqual({
    workspace: 'association',
    projectSlug: '',
    tab: 'settings'
  });
  expect(parseDashboardPath('/people/abc')?.memberId).toBe('abc');
});

test('article slugs persist in standalone routes and reject malformed segments', () => {
  expect(parseDashboardPath('/articles/project-introduction')).toEqual({
    workspace: 'directory',
    projectSlug: '',
    tab: 'articles',
    articleSlug: 'project-introduction'
  });
  expect(articlePath('project-introduction')).toBe('/articles/project-introduction');
  expect(parseDashboardPath('/articles/a%2Fb')).toBeNull();
  expect(parseDashboardPath('/articles/a/extra')).toBeNull();
});

test('the layout resolves the active tab from the route', () => {
  expect(tabFromPath('/projects')).toBe('projects');
  expect(tabFromPath('/projects/new')).toBe('__create_project__');
  expect(tabFromPath('/projects/roboty')).toBe('overview');
  expect(tabFromPath('/projects/roboty/kanban')).toBe('board');
  expect(tabFromPath('/projects/roboty/kanban/graveyard')).toBe('board');
  expect(tabFromPath('/projects/roboty/tasks/abc')).toBe('board');
  expect(tabFromPath('/projects/roboty/forum/abc')).toBe('forum');
  expect(tabFromPath('/association/members')).toBe('roster');
  expect(tabFromPath('/members/abc')).toBe('users');
  expect(tabFromPath('/articles/intro')).toBe('articles');
});
