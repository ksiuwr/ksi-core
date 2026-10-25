import { marked } from 'marked';
export function mentionedUserIds(markdown: string): string[] {
  const ids = new Set<string>();
  void marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type !== 'link') return;
    const match = token.href.match(/^\/members\/([A-Za-z0-9_-]{1,100})$/);
    if (match) ids.add(match[1]!);
  });
  return [...ids];
}
