<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { TextAlignStart } from '@lucide/svelte';
  import { scrollToSection, sectionElement } from './heading-anchors';
  let {
    headings,
    content,
    onhash
  }: {
    headings: { id: string; level: number; text: string }[];
    /** Element holding the rendered headings, observed while the reader scrolls. */
    content: HTMLElement | undefined;
    onhash: (url: URL) => void;
  } = $props();

  const uid = $props.id();
  // Each nesting level moves the outline line this far to the right.
  const step = 14;
  let scroller = $state<HTMLDivElement>();
  let list = $state<HTMLOListElement>();
  let links = $state<HTMLAnchorElement[]>([]);
  let outline = $state({
    path: '',
    width: 0,
    height: 0,
    tops: [] as number[],
    bottoms: [] as number[]
  });
  let active = $state<string[]>([]);
  const minimum = $derived(Math.min(...headings.map((heading) => heading.level)));
  const depth = (index: number) => Math.min(headings[index]!.level - minimum, 3);
  const first = $derived(headings.findIndex((heading) => active.includes(heading.id)));
  const last = $derived(
    headings.reduce((found, heading, index) => (active.includes(heading.id) ? index : found), -1)
  );
  const clip = $derived(
    first < 0
      ? 'inset(0 0 100% 0)'
      : `inset(${outline.tops[first]}px 0 ${outline.height - outline.bottoms[last]!}px 0)`
  );

  /** Traces the line through every entry, slanting where the nesting level changes. */
  function measure() {
    if (!list) return;
    const points: string[] = [];
    const tops: number[] = [];
    const bottoms: number[] = [];
    let width = 0;
    headings.forEach((_, index) => {
      const link = links[index];
      if (!link) return;
      const x = depth(index) * step + 1;
      const top = link.offsetTop;
      const bottom = top + link.offsetHeight;
      const slantIn = index > 0 && depth(index - 1) !== depth(index) ? 6 : 0;
      const slantOut = index < headings.length - 1 && depth(index + 1) !== depth(index) ? 6 : 0;
      points.push(
        `${points.length ? 'L' : 'M'}${x} ${top + slantIn}`,
        `L${x} ${bottom - slantOut}`
      );
      tops.push(top);
      bottoms.push(bottom);
      width = Math.max(width, x + 1);
    });
    outline = { path: points.join(' '), width, height: list.offsetHeight, tops, bottoms };
  }

  /** Every section with any part in the viewport is highlighted, like a scroll thumb. */
  function track() {
    if (!content) return;
    const sections = headings.map((heading) => sectionElement(content!, heading.id));
    const end = content.getBoundingClientRect().bottom;
    const visible: string[] = [];
    sections.forEach((section, index) => {
      if (!section) return;
      const top = section.getBoundingClientRect().top;
      const next = sections.slice(index + 1).find(Boolean);
      const bottom = next ? next.getBoundingClientRect().top : end;
      if (bottom > 8 && top < window.innerHeight) visible.push(headings[index]!.id);
    });
    if (visible.join() !== active.join()) active = visible;
  }

  // Keep highlighted entries in view when the outline is taller than the screen.
  $effect(() => {
    if (!scroller || first < 0) return;
    const top = outline.tops[first]!;
    const bottom = outline.bottoms[last]!;
    if (top < scroller.scrollTop) scroller.scrollTop = top - 8;
    else if (bottom > scroller.scrollTop + scroller.clientHeight)
      scroller.scrollTop = Math.min(top - 8, bottom - scroller.clientHeight + 8);
  });

  $effect(() => {
    void headings;
    void tick().then(() => {
      measure();
      track();
    });
  });

  onMount(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(track);
    };
    const resize = new ResizeObserver(() => {
      measure();
      schedule();
    });
    if (list) resize.observe(list);
    if (content) resize.observe(content);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  });

  function follow(event: MouseEvent, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || !content) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = id;
    onhash(url);
    scrollToSection(content, id);
  }
</script>

{#if headings.length}
  <nav class="docs-toc" aria-labelledby={`${uid}-title`}>
    <p class="docs-toc-title" id={`${uid}-title`}>
      <TextAlignStart size={15} aria-hidden="true" />{'On this page'}
    </p>
    <div class="docs-toc-scroller" bind:this={scroller}>
      <div class="docs-toc-body">
        <svg
          class="docs-toc-line"
          width={outline.width}
          height={outline.height}
          viewBox={`0 0 ${outline.width} ${outline.height}`}
          aria-hidden="true"
        >
          <path d={outline.path} />
        </svg>
        <svg
          class="docs-toc-line active"
          width={outline.width}
          height={outline.height}
          viewBox={`0 0 ${outline.width} ${outline.height}`}
          style:clip-path={clip}
          aria-hidden="true"
        >
          <path d={outline.path} />
        </svg>
        <ol bind:this={list}>
          {#each headings as heading, index (heading.id)}
            <li>
              <a
                bind:this={links[index]}
                href={`#${heading.id}`}
                class:active={active.includes(heading.id)}
                aria-current={active[0] === heading.id ? 'location' : undefined}
                style:padding-left={`${depth(index) * step + 16}px`}
                onclick={(event) => follow(event, heading.id)}>{heading.text}</a
              >
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </nav>
{/if}

<style>
  .docs-toc {
    display: grid;
    gap: 12px;
    font-size: 13px;
  }
  .docs-toc-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .docs-toc-scroller {
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .docs-toc-body {
    position: relative;
  }
  .docs-toc-line {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }
  .docs-toc-line path {
    fill: none;
    stroke: var(--line);
    stroke-width: 1;
    stroke-linejoin: round;
  }
  .docs-toc-line.active {
    transition: clip-path 220ms ease;
  }
  .docs-toc-line.active path {
    stroke: var(--ink);
    stroke-width: 2;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  a {
    display: block;
    padding-block: 5px;
    padding-right: 4px;
    color: var(--muted);
    line-height: 1.4;
    text-decoration: none;
    overflow-wrap: anywhere;
    transition: color 150ms ease;
  }
  a:hover,
  a.active {
    color: var(--ink);
  }
  @media (prefers-reduced-motion: reduce) {
    .docs-toc-line.active,
    a {
      transition: none;
    }
  }
</style>
