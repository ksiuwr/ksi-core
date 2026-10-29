// Heading ids are prefixed so page content can never collide with ids used by the app itself,
// while the address bar keeps the readable `#heading` form.
export const sectionElement = (root: ParentNode, id: string) =>
  id ? root.querySelector<HTMLElement>(`#section-${CSS.escape(id)}`) : null;

export function scrollToSection(root: ParentNode, id: string, smooth = true) {
  const target = sectionElement(root, id);
  if (!target) return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
  return true;
}

type Options = {
  /** Updates the address without a navigation; SvelteKit apps pass `replaceState`. */
  onhash: (url: URL) => void;
  copiedLabel: string;
  copyLabel: string;
};

/**
 * Copies a section link when its heading anchor is clicked, follows links to sections of the
 * same page and scrolls to the section named in the address once the content is rendered.
 */
export function headingAnchors(node: HTMLElement, options: Options) {
  let current = options;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const label = () => {
    for (const anchor of node.querySelectorAll<HTMLAnchorElement>('a.heading-anchor')) {
      if (anchor.classList.contains('copied')) continue;
      anchor.setAttribute('aria-label', current.copyLabel);
      anchor.title = current.copyLabel;
    }
  };
  function click(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || !node.contains(link)) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const id = decodeURIComponent(url.hash.slice(1));
    if (!sectionElement(node, id)) return;
    event.preventDefault();
    current.onhash(url);
    scrollToSection(node, id);
    if (!link.classList.contains('heading-anchor')) return;
    void navigator.clipboard?.writeText(url.href).then(() => {
      link.classList.add('copied');
      link.setAttribute('aria-label', current.copiedLabel);
      link.title = current.copiedLabel;
      const timer = setTimeout(() => {
        timers.delete(timer);
        link.classList.remove('copied');
        label();
      }, 1600);
      timers.add(timer);
    });
  }
  const follow = () => scrollToSection(node, decodeURIComponent(location.hash.slice(1)));
  node.addEventListener('click', click);
  window.addEventListener('hashchange', follow);
  label();
  const frame = requestAnimationFrame(() =>
    scrollToSection(node, decodeURIComponent(location.hash.slice(1)), false)
  );
  return {
    update(next: Options) {
      current = next;
      label();
    },
    destroy() {
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
      node.removeEventListener('click', click);
      window.removeEventListener('hashchange', follow);
    }
  };
}
