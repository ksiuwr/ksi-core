# Dashboard Layout Rework TODO

Branch: `rework/dashboard-layout`

## Goal

- Rework the dashboard from a single catch-all route with view `if` statements
  to normal SvelteKit routing.
- Change the task view modal to be less detailed, with just a preview,
  suggesting user to open the fullscreen page to work.
- Move tasks to dedicated full-screen pages at `tasks/[id]`.
- Move task metadata into an aside column.
- Change the layout of forum post to be more structural, being similar to
  fullscreen task view.

## Routing

- [x] Extract the shared dashboard shell into `+layout.svelte`.
- [x] Split `apps/dashboard/src/routes/[...workspace]/+page.svelte` into normal
      routes.
- [x] Add project routes: `/projects`, `/projects/new`, `/projects/[slug]`.
- [x] Add workspace routes: overview, kanban, forum, articles, events, roster,
      settings, permissions, previews.
- [x] Add association routes.
- [x] Add global routes: profile, inbox, settings, members, people, articles.
- [x] Remove the catch-all route after migration.

## Task pages

- [x] Add `/projects/[slug]/tasks/[id]`.
- [x] Add `/association/tasks/[id]`.
- [x] Move task detail out of the KanbanBoard modal into a task page.
- [x] Implement main column plus aside metadata layout.
- [x] Make board cards link to task pages.
- [x] Reduce the task view modal to a preview with a link to the task page.
- [x] Preserve or redirect old `kanban?item=` URLs.

## Forum

- [x] Restructure forum thread view to a main column plus aside metadata layout.
- [x] Reuse fullscreen task view layout patterns for forum posts.

## Navigation

- [x] Replace custom `navigation.ts` parsing with normal route params where
      practical.
- [x] Update all `dashboardPath` and `parseDashboardPath` callers.
- [x] Update `apps/dashboard/src/lib/navigation.test.ts`.

## Data loading

- [x] Move tab-specific fetching into route `load` functions.
- [x] Update realtime WebSocket refresh to invalidate the current route.

## Links and backend

- [x] Update `linkForMetadata` `itemId` links to `tasks/[id]`.
- [x] Update `linkForAction` kanban/item links.
- [x] Update backend `notificationTarget()` href to `tasks/[id]`.
- [x] Update references endpoint href to `tasks/[id]`.
- [x] Update references route href validation regex.
- [x] Update integration test href expectations.

## Components

- [x] Split `KanbanBoard.svelte` board behavior from task detail behavior.
- [x] Extract task metadata aside component.
- [x] Reduce `KanbanBoard.svelte` task dialog to preview-only content.
- [x] Restructure forum post view to a main column plus aside metadata layout.
- [x] Reduce the size of the catch-all page during migration.

## Verification

- [x] Run dashboard navigation tests.
- [x] Run server integration tests.
- [x] Manual smoke test all dashboard routes.
- [x] Manual smoke test task modal preview and forum post layout.
