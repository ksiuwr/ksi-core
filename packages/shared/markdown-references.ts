import type { TokenizerAndRendererExtension, Tokens } from 'marked';

/**
 * Numeric references to tasks and threads, recognised purely by syntax:
 *
 * | Syntax     | Meaning                                         |
 * | ---------- | ----------------------------------------------- |
 * | `#12`      | number 12 in the current workspace               |
 * | `##12`     | number 12 in the association-wide workspace      |
 * | `#slug/12` | number 12 in the project workspace `slug`        |
 *
 * Numbers start with 1-9 and have at most nine digits. A reference cannot follow a
 * letter, digit, `_`, `/`, `&` or `#` (so `issue#12`, `&#39;` and `###12` stay text)
 * and cannot be followed by a letter, digit, `_` or `/` (so `#12abc` stays text).
 * Headings are unaffected because Markdown requires a space after their hashes.
 */
export const associationReferenceScope = '~association';
export const referenceBasePath = '/references';
export type ReferenceKind = 'local' | 'workspace' | 'association';
export type MarkdownReference = {
  kind: ReferenceKind;
  scope: string;
  number: number;
  raw: string;
};

const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const number = '[1-9]\\d{0,8}';
const referenceSyntax = new RegExp(
  `^(?:##(${number})|#(${slug})\\/(${number})|#(${number}))(?![\\p{L}\\p{N}_/])`,
  'u'
);
const scopeSyntax = new RegExp(`^(?:${associationReferenceScope}|${slug})$`);
const numberSyntax = new RegExp(`^${number}$`);
const precedingBlocker = /[\p{L}\p{N}_/&#]/u;

export const isReferenceScope = (value: string) => scopeSyntax.test(value);
export const isReferenceNumber = (value: string) => numberSyntax.test(value);

/** The workspace a dashboard path belongs to, used to resolve bare `#12` references. */
export function referenceScopeForPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (!match) return associationReferenceScope;
  let scope: string;
  try {
    scope = decodeURIComponent(match[1]!);
  } catch {
    return associationReferenceScope;
  }
  return isReferenceScope(scope) ? scope : associationReferenceScope;
}

/** Path that the dashboard resolves to the referenced task or thread. */
export function referenceHref(scope: string, referenceNumber: number | string) {
  return `${referenceBasePath}/${encodeURIComponent(scope)}/${referenceNumber}`;
}

/** Parses a reference at the start of `source`; boundaries before it are the caller's concern. */
export function parseReference(source: string, currentScope: string): MarkdownReference | null {
  const match = source.match(referenceSyntax);
  if (!match) return null;
  const [raw, association, workspace, workspaceNumber, local] = match;
  if (association)
    return {
      kind: 'association',
      scope: associationReferenceScope,
      number: Number(association),
      raw
    };
  if (workspace)
    return { kind: 'workspace', scope: workspace, number: Number(workspaceNumber), raw };
  return { kind: 'local', scope: currentScope, number: Number(local), raw };
}

/** Whether a reference may start right after `previous` (the preceding character, if any). */
export const referenceMayFollow = (previous: string | undefined) =>
  !previous || !precedingBlocker.test(previous);

type ReferenceToken = Tokens.Generic & MarkdownReference;
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Marked extension that links references; it never runs inside code, links or raw HTML code. */
export function referenceExtension(currentScope: string): TokenizerAndRendererExtension {
  if (!isReferenceScope(currentScope)) throw new Error(`Invalid reference scope: ${currentScope}`);
  return {
    name: 'collaborationReference',
    level: 'inline',
    // Marked passes the source without its first character, so index 0 has no visible
    // predecessor; the tokenizer re-checks the real one against the previous token.
    start(source) {
      for (let index = source.indexOf('#'); index !== -1; index = source.indexOf('#', index + 1)) {
        if (index === 0 || referenceMayFollow(source[index - 1])) return index;
      }
    },
    tokenizer(source, tokens) {
      // inRawBlock covers inline <code>, <pre>, <kbd> and <script> written as raw HTML.
      const { inLink, inRawBlock } = this.lexer.state;
      if (inLink || inRawBlock || !source.startsWith('#')) return;
      if (!referenceMayFollow(tokens.at(-1)?.raw.at(-1))) return;
      const reference = parseReference(source, currentScope);
      if (!reference) return;
      return { type: 'collaborationReference', text: reference.raw, ...reference };
    },
    renderer(token) {
      const reference = token as ReferenceToken;
      const scope = escapeHtml(reference.scope);
      return `<a class="reference-link" data-sveltekit-reload data-sveltekit-preload-data="off" data-reference-kind="${reference.kind}" data-reference-scope="${scope}" data-reference-number="${reference.number}" href="${escapeHtml(referenceHref(reference.scope, reference.number))}">${escapeHtml(reference.raw)}</a>`;
    }
  };
}
