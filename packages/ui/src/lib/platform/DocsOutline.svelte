<script lang="ts">
  import { ChevronDown, TextAlignStart } from '@lucide/svelte';
  import { scrollToSection } from './heading-anchors';

  // The compact outline for screens too narrow for the sticky table of contents.
  let {
    headings,
    content,
    onhash
  }: {
    headings: { id: string; level: number; text: string }[];
    /** Element holding the rendered headings. */
    content: HTMLElement | undefined;
    onhash: (url: URL) => void;
  } = $props();

  let details = $state<HTMLDetailsElement>();
  const minimum = $derived(Math.min(...headings.map((heading) => heading.level)));

  function follow(event: MouseEvent, id: string) {
    if (!content) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = id;
    onhash(url);
    scrollToSection(content, id);
    if (details) details.open = false;
  }
</script>

{#if headings.length}
  <details class="docs-outline" bind:this={details}>
    <summary
      ><TextAlignStart size={15} aria-hidden="true" />Na tej stronie<ChevronDown
        class="docs-outline-chevron"
        size={15}
        aria-hidden="true"
      /></summary
    >
    <ol>
      {#each headings as heading (heading.id)}
        <li style:padding-left={`${Math.min(heading.level - minimum, 3) * 14}px`}>
          <a href={`#${heading.id}`} onclick={(event) => follow(event, heading.id)}
            >{heading.text}</a
          >
        </li>
      {/each}
    </ol>
  </details>
{/if}

<style>
  .docs-outline {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    font-size: 13px;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    color: var(--muted);
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary :global(.docs-outline-chevron) {
    margin-left: auto;
    transition: transform 120ms var(--ease-out);
  }
  .docs-outline[open] summary :global(.docs-outline-chevron) {
    transform: rotate(180deg);
  }
  ol {
    max-height: 50dvh;
    margin: 0;
    padding: 0 12px 10px;
    overflow-y: auto;
    list-style: none;
  }
  a {
    display: block;
    padding: 4px 0;
    color: var(--ink);
    line-height: 1.4;
    text-decoration: none;
  }
  a:hover {
    color: var(--accent);
  }
  @media (prefers-reduced-motion: reduce) {
    summary :global(.docs-outline-chevron) {
      transition: none;
    }
  }
</style>
