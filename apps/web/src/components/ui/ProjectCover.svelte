<script lang="ts">
  import { primaryField, projectCover } from '$lib/project-cover';

  /**
   * Generated artwork for a project. `width` and `height` set the drawing
   * canvas, so wide banners get more detail instead of stretched strokes.
   */
  let {
    slug,
    fields,
    width = 400,
    height = 240,
    class: className = ''
  }: {
    slug: string;
    fields?: readonly string[];
    width?: number;
    height?: number;
    class?: string;
  } = $props();

  const id = $props.id();
  const field = $derived(primaryField(fields));
  const cover = $derived(projectCover(slug, field, width, height));
</script>

<div
  class="cover {className}"
  data-field={field}
  style:--cover-shift={cover.hueShift}
  style:--focus-x="{Math.round(cover.focus.x * 100)}%"
  style:--focus-y="{Math.round(cover.focus.y * 100)}%"
  aria-hidden="true"
>
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid slice">
    {#if cover.grid}
      <defs>
        <pattern
          id="{id}-grid"
          x={-cover.grid / 2}
          y={-cover.grid / 2}
          width={cover.grid}
          height={cover.grid}
          patternUnits="userSpaceOnUse"
        >
          <circle class="grid-dot" cx={cover.grid / 2} cy={cover.grid / 2} r="1" />
        </pattern>
      </defs>
      <rect {width} {height} fill="url(#{id}-grid)" />
    {/if}
    {#each cover.shapes as shape, index (index)}
      {#if shape.kind === 'path'}
        <path class="line" d={shape.d} stroke-width={shape.width} opacity={shape.opacity} />
      {:else if shape.kind === 'rect'}
        <rect
          class="chip"
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx="5"
        />
      {:else}
        <circle class={shape.style} cx={shape.x} cy={shape.y} r={shape.r} />
      {/if}
    {/each}
  </svg>
</div>

<style>
  .cover {
    --cover-hue: calc(var(--field-hue) + var(--cover-shift, 0));
    --cover-bg: oklch(0.965 0.016 var(--cover-hue));
    --cover-tone: oklch(0.56 0.12 var(--cover-hue));
    position: relative;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(
        circle at var(--focus-x) var(--focus-y),
        color-mix(in oklch, var(--cover-tone) 18%, transparent),
        transparent 70%
      ),
      var(--cover-bg);
    color: var(--cover-tone);
  }
  :global([data-theme='dark']) .cover {
    --cover-bg: oklch(0.235 0.02 var(--cover-hue));
    --cover-tone: oklch(0.77 0.1 var(--cover-hue));
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transition: scale 900ms var(--ease-out);
  }
  svg * {
    vector-effect: non-scaling-stroke;
  }
  :global(.group:hover) .cover svg {
    scale: 1.045;
  }
  .grid-dot {
    fill: currentColor;
    opacity: 0.28;
  }
  .line {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .chip {
    fill: color-mix(in oklch, currentColor 14%, var(--cover-bg));
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .solid {
    fill: currentColor;
  }
  .soft {
    fill: color-mix(in oklch, currentColor 22%, transparent);
    stroke: currentColor;
    stroke-width: 1.2;
  }
  .ring {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
  }
  .pad {
    fill: var(--cover-bg);
    stroke: currentColor;
    stroke-width: 1.6;
  }
  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
    :global(.group:hover) .cover svg {
      scale: none;
    }
  }
</style>
