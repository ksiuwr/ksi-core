<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte';
  import FieldTag from './FieldTag.svelte';
  import ProjectCover from './ProjectCover.svelte';

  let {
    project
  }: {
    project: {
      slug: string;
      name: string;
      description?: string | null;
      fields?: string[];
      tags?: string[];
    };
  } = $props();
</script>

<a
  href={`/projects/${encodeURIComponent(project.slug)}`}
  class="group surface-card surface-card-link text-ink flex min-w-0 flex-col overflow-hidden"
>
  <ProjectCover
    slug={project.slug}
    fields={project.fields}
    class="border-line aspect-[5/3] border-b"
  />
  <div class="flex flex-1 flex-col p-5">
    {#if project.fields?.length}
      <div class="mb-3 flex flex-wrap gap-1.5">
        {#each project.fields as field (field)}<FieldTag {field} />{/each}
      </div>
    {/if}
    <h3 class="text-xl tracking-tight wrap-anywhere">{project.name}</h3>
    {#if project.description}
      <p class="text-muted mt-2 line-clamp-3 text-[13.5px] leading-relaxed wrap-anywhere">
        {project.description}
      </p>
    {/if}
    <div class="mt-auto flex items-end justify-between gap-4 pt-5">
      <span class="text-muted min-w-0 truncate font-mono text-[11px]">
        {project.tags?.map((tag) => `#${tag}`).join(' ')}
      </span>
      <span
        class="border-line group-hover:bg-ink group-hover:text-paper grid size-8 shrink-0 place-items-center rounded-full border transition-colors"
      >
        <ArrowUpRight class="size-4" aria-hidden="true" />
      </span>
    </div>
  </div>
</a>
