<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import { ArrowUpRight, Plus } from '@lucide/svelte';
  import type { Project } from '$lib/types';

  let { projects, role }: { projects: Project[]; role: string } = $props();
  const language = $derived(preferences.language);
</script>

<div class="workspace-header">
  <div>
    <h1>Projects</h1>
    <p class="workspace-description">Choose a project and start collaborating.</p>
  </div>
  {#if role !== 'member'}
    <a class="btn" href="/projects/new">
      <Plus size={16} aria-hidden="true" />{'New project'}
    </a>
  {/if}
</div>

<div class="project-grid">
  {#each projects as project (project.id)}
    <article class="project-card">
      <div class="eyebrow">
        {#each project.fields as field}
          <span class="tag" style="background: var(--mint);">{field}</span>
        {/each}
        {#if project.locked}
          <span class="tag">Locked</span>
        {/if}
      </div>
      <h2>{project.name}</h2>
      <MarkdownContent value={project.description} />
      <div class="project-card-actions">
        <a class="btn" href={`/projects/${encodeURIComponent(project.slug)}`}>
          {'Open project'}
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  {/each}
</div>

{#if !projects.length}
  <div class="empty-state">
    <h2>No projects yet</h2>
    <p>New projects will appear here.</p>
  </div>
{/if}
