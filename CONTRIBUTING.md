# Contributing

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.

This means each commit message starts with a `type` prefix depending on its meaning.

Available types:

```
build
chore
ci
docs
feat
fix
perf
refactor
revert
style
test
```

For changes that affect only the frontend or only the backend, add a scope in parentheses after the type. Scopes can be chosen freely, but a common set is `ui, backend, frontend, lang, db`.

For example, `feat(ui):` means a UI feature was added,
`feat(frontend):` means a frontend feature was added.

> These two are not synonymous. Frontend adds new elements, text, or functionality, while UI only changes appearance, improves, or restructures a page without changing its content.

`feat(backend):` means a backend feature was added.

When a commit changes the whole application scope, omit the scope: `feat:`.

## Examples

1. You fixed a bug where an element overflowed its parent container:

```
fix(ui): prevent element overflow in parent container
```

2. You added a new API endpoint (backend change):

```
feat(backend): create user registration endpoint
```

3. You updated documentation (no code changes):

```
docs: update installation guide in README
```

4. You changed a library version in `package.json` (housekeeping):

```
chore(deps): bump axios from 0.21.0 to 0.21.1
```

5. You refactored database code to improve performance (no behavior change):

```
refactor(db): optimize user search query index
```

## Commit message structure

Remember that `type` and `scope` are only the header. A full commit message should look like this:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **Description:** Short description of the change (50-70 characters), in imperative mood (e.g. "add" instead of "added").
- **Body (optional):** If the change needs more explanation, add a blank line after the description and write details about what and why, not how.
- **Footer (optional):** Place for "Breaking Changes" information or ticket links (e.g. `Closes #123`).

### Breaking changes

If your commit introduces a backwards-incompatible change, mark it explicitly:

1. By adding `!` after the type/scope, e.g. `feat(backend)!: drop support for Node 12`.
2. OR by adding `BREAKING CHANGE: <description>` in the footer.

## Branch naming

Use the format:

`username/short-description-of-change`

Examples:

- `crqch/user-login`
- `janek/header-alignment`

## Versioning

The release version for the deployed KSI application lives in the root `package.json`.
The web, auth, dashboard, and server apps ship together, so update that version once per
application release. Frontend builds display the same root version. Keep their workspace
package manifests unversioned to avoid implying that they are released independently.

Use CalVer in `YYYY.MM.PATCH` form for production releases. Run `bun run version:bump`
in the release PR to reset the patch to 0 when the UTC month changes, or increment it
for another release in the same month. Since pushes to `master` deploy automatically,
include the release version bump with each user-facing production change. If another
release merges first, update your branch and rerun the command before merging. Image tags
remain tied to the source commit, and production manifests pin immutable image digests;
these identify the exact build and support rollback independently of the human-facing
release version. The `ksi-cluster` repository tracks deployment state through Git commits
and those image digests, not a separate copy of the application version. The
`@ksi-core/ui` package may keep its own version if it is released independently.

## Architecture

The repository is a Bun workspace monorepo:

```text
apps/
  web/        public SvelteKit site
  auth/       SSO/auth UI
  dashboard/  admin UI
  server/     Elysia API, Drizzle ORM, PostgreSQL
packages/
  shared/     shared types, helpers, content locales, markdown
  ui/         shared Svelte components and styles
```

- Put reusable code in `packages/*`; apps consume it through `workspace:*`.
- Frontends never access the database directly. All data goes through `apps/server`.
- `packages/shared` owns shared types, URL/environment helpers, content-locale logic, proxy helpers, and markdown utilities.
- `packages/ui` owns reusable Svelte components and platform styles. Its translatable strings are included in each app's Wuchale configuration.

### Frontend/backend boundary and authentication

- SvelteKit hooks resolve the current user from backend session data.
- Browser requests to `/api/*` are proxied by the frontend origin using `PROXY_SECRET` and origin checks.
- Better Auth lives in `apps/server`; auth endpoints are only reachable through the auth origin.
- SSO uses verifier/state cookies and frontend session records. Session tokens are environment-scoped.
- Protected backend routes use `createElysia({ protectedRoute: true })` and `requirePermission`.

### Data and content

- Database schema and migrations live in `apps/server/src/db`. Use `bun db:generate` and `bun db:migrate`.
- English is the source language for user-editable content. Profiles, projects, and articles store normal fields plus `translations`.
- `packages/shared/content-locales.ts` provides `localizeContent`, `contentLocale`, and `hasEnglishSources`.
- UI locales are `frontendLocales` (`en-us`, `pl`); content locales are `contentLocales` (`en`, `pl`).
- Translation writes require the English source to exist and pass `hasEnglishSources`. Project and article translation writes also check version conflicts.
- Markdown rendering is centralized in the backend `/markdown` endpoint with optional reference scoping.

### Permissions

- Permissions are strings checked through `effectivePermissions` and `requirePermission`.
- Project and article mutations use scope checks; content operations also require leader permissions where applicable.
- Activity and audit events are recorded for content and translation changes.

## UI translations with Wuchale

Wuchale is compile-time i18n. Strings are extracted from source at build time and replaced with runtime catalog calls. This is separate from backend content translations.

### Configuration

- Each app has a `wuchale.config.js`.
- Locales come from `packages/shared/content-locales.ts` (`frontendLocales`: `en-us`, `pl`).
- The source language is `en-us`; in `en-us.po`, `msgstr` should equal `msgid`.
- Generated files (`.wuchale/`, `data.js`, `*.loader.svelte.js`) are gitignored. Only `*.po` files are committed.

### How to write translatable strings

Write plain English string literals directly in Svelte markup or attributes:

```svelte
<h2>Create alert</h2>
<button title="Logout">...</button>
```

Mixed text and expressions are supported and become placeholders:

```svelte
<p>© KSI {new Date().getFullYear()}</p>
```

Do not use ternary operators to choose translatable strings:

```svelte
<!-- Bad: compiles to a single catalog entry and loses the condition/branch -->
{editingId ? 'Edit alert' : 'Create alert'}
```

Use plain text in separate template branches instead:

```svelte
{#if editingId}
  Edit alert
{:else}
  Create alert
{/if}
```

Do not build translatable sentences in TypeScript or JavaScript (arrays, ternaries, conditional helper functions). Put each user-facing literal directly in the template so Wuchale can extract it.

Shared UI strings must be listed in each app's Wuchale `files` array, for example:

```js
'../../packages/ui/src/lib/platform/Markdown.svelte';
```

### Workflow

1. Add or edit plain English text in components.
2. Run the app dev server or `bunx wuchale` to regenerate `.po` files.
3. Translate new `msgid` entries in `pl.po`.
4. Run `bunx wuchale check`.
5. Commit only `.po` changes; never commit generated Wuchale files.
6. Use `bunx wuchale --clean` occasionally to remove stale catalog entries.

## Content translations

Backend content translations are stored in JSON alongside English source fields. They are managed through the platform translation endpoints and localized with `localizeContent` from `packages/shared/content-locales.ts`.

- Supported content locales are `en` and `pl`.
- English source fields are required before a translation can be saved.
- `hasEnglishSources` prevents saving translations when the English source is missing.
- Translation updates are versioned for projects and articles.

## Development and testing

Before opening a PR, run:

1. `bun prettier -w .` or the project's formatter command to format code,
2. `bun run check`,
3. `bun run lint`,
4. `bun run format:check`,
5. `bun test apps/server/src/domain apps/server/src/routes/platform/access.test.ts packages/shared apps/dashboard/src/lib/navigation.test.ts`,
6. `bunx wuchale check` when UI text changed.

## Pull requests

Before creating a pull request:

1. Run `bun prettier -w .` to format code.
2. Make sure the PR title follows Conventional Commits (the PR title often becomes the commit message on squash and merge).
3. If you changed UI text, update `.po` files and run `bunx wuchale check`.
4. If you changed database models, add Drizzle migrations and run `bun db:generate` / `bun db:migrate`.
5. Update the application version with `bun run version:bump` in PRs containing user-facing production changes.
