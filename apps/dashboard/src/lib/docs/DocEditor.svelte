<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import { ArrowLeft, FileDiff, Save, Send, Info } from '@lucide/svelte';
  import { docsPath, docSlugPattern, reservedDocSlugs } from 'shared/docs';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import { docsRequest, errorCode, slugFromTitle, type DocAccess, type DocDetail } from './docs';

  let {
    projectId,
    slug,
    page,
    access,
    workspaceName
  }: {
    projectId: string;
    slug: string | null;
    /** Null while creating a page. */
    page: DocDetail | null;
    access: DocAccess;
    workspaceName: string;
  } = $props();

  // Live updates refresh the page data; the editor keeps the version it started from,
  // so saving over someone else's change is still reported as a conflict.
  const original = untrack(() =>
    page
      ? {
          id: page.id,
          slug: page.slug,
          version: page.version,
          title: page.title,
          markdown: page.markdown,
          public: page.public
        }
      : null
  );
  let title = $state(original?.title ?? '');
  let address = $state('');
  let addressEdited = $state(false);
  let markdown = $state(original?.markdown ?? '');
  let reason = $state('');
  let visible = $state(original?.public ?? false);
  let compared = $state<string | null>(null);
  let busy = $state(false);
  let error = $state('');

  const direct = $derived(access.canReview);
  const addressValid = $derived(
    new RegExp(docSlugPattern).test(address) && !reservedDocSlugs.includes(address)
  );
  const changed = $derived(
    !original ||
      title !== original.title ||
      markdown !== original.markdown ||
      visible !== original.public
  );
  const ready = $derived(
    !!title.trim() &&
      changed &&
      (!!original || addressValid) &&
      (direct || reason.trim().length >= 3)
  );
  const back = $derived(original ? docsPath(slug, original.slug) : docsPath(slug));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    busy = true;
    error = '';
    const content = { title: title.trim(), markdown, public: visible, reason: reason.trim() };
    try {
      if (direct && original) {
        await docsRequest(`/docs/${original.id}`, 'PUT', { ...content, version: original.version });
        await goto(docsPath(slug, original.slug));
      } else if (direct) {
        await docsRequest('/docs', 'POST', {
          ...content,
          slug: address,
          ...(projectId ? { projectId } : {})
        });
        await goto(docsPath(slug, address));
      } else {
        const proposal = await docsRequest<{ id: string }>('/docs/proposals', 'POST', {
          ...content,
          ...(original
            ? { pageId: original.id, baseVersion: original.version }
            : { slug: address, ...(projectId ? { projectId } : {}) })
        });
        await goto(docsPath(slug, 'suggestions', proposal.id));
      }
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <div>
    <p class="docs-editor-eyebrow">{workspaceName}</p>
    <h1>
      {#if original && direct}{'Edit page'}{:else if original}{'Suggest changes'}{:else if direct}{'New page'}{:else}{'Suggest a new page'}{/if}
    </h1>
    {#if !direct}
      <p class="workspace-description">
        {'Leaders and reviewers of this workspace will compare your version with the current one and accept or decline it.'}
      </p>
    {/if}
  </div>
  <a class="btn btn-outline" href={back}><ArrowLeft size={15} aria-hidden="true" />{'Cancel'}</a>
</div>
<DocError code={error} />
{#if !access.canPropose}
  <DocError code="FORBIDDEN" />
{:else}
  <form class="docs-editor card" onsubmit={submit}>
    <div class="docs-editor-fields">
      <div>
        <label for="doc-title">{'Title'}</label>
        <input
          id="doc-title"
          bind:value={title}
          maxlength="200"
          required
          oninput={() => {
            if (!original && !addressEdited) address = slugFromTitle(title);
          }}
        />
      </div>
      {#if !original}
        <div>
          <label for="doc-address">{'Address'}</label>
          <input
            id="doc-address"
            bind:value={address}
            maxlength="100"
            required
            aria-describedby="doc-address-help"
            oninput={() => (addressEdited = true)}
          />
          <p id="doc-address-help" class="field-help">
            {#if address && !addressValid}
              <span class="field-error"
                >{'Use lowercase letters, digits and single hyphens. “new”, “suggestions” and “contributors” are reserved.'}</span
              >
            {:else}
              {'Other pages link here by writing'} <code>[{address || 'address'}]</code>
            {/if}
          </p>
        </div>
      {/if}
    </div>
    <div class="docs-editor-content">
      <Editor bind:value={markdown} rows={22} allowGallery docs />
    </div>
    <div class="docs-editor-fields">
      <div class="docs-editor-reason">
        <label for="doc-reason">
          {#if direct}{'Summary of changes (optional)'}{:else}{'Reason for the change'}{/if}
        </label>
        <textarea
          id="doc-reason"
          bind:value={reason}
          rows="3"
          maxlength="1000"
          required={!direct}
          placeholder={'What changed and why? For example: “Updated after ZOSIA 2026, we ran out of extension cords.”'}
        ></textarea>
      </div>
      <div class="docs-editor-visibility">
        <label class="docs-check">
          <input type="checkbox" bind:checked={visible} disabled={direct && !access.canPublish} />
          {#if direct}{'Public on the KSI website'}{:else}{'Request publishing on the KSI website'}{/if}
        </label>
        <p class="field-help">
          <Info size={13} aria-hidden="true" />
          <span>
            {#if direct && !access.canPublish}
              {'Only workspace leaders can change whether a page is public.'}
            {:else}
              {'Public pages can be read by anyone. Links to internal pages show only their titles.'}
            {/if}
          </span>
        </p>
      </div>
    </div>
    <div class="docs-editor-actions">
      <button
        type="button"
        class="btn btn-outline"
        disabled={!changed}
        onclick={() => (compared = markdown)}
        ><FileDiff
          size={15}
          aria-hidden="true"
        />{#if compared !== null && compared !== markdown}{'Refresh comparison'}{:else}{'Review changes'}{/if}</button
      >
      <button class="btn" disabled={!ready || busy}>
        {#if direct}<Save
            size={15}
            aria-hidden="true"
          />{#if original}{'Save changes'}{:else}{'Create page'}{/if}{:else}<Send
            size={15}
            aria-hidden="true"
          />{'Submit suggestion'}{/if}
      </button>
    </div>
  </form>
  {#if compared !== null}
    <section class="docs-editor-compare" aria-label={'Changes'}>
      <h2>{'Your changes'}</h2>
      <DocDiff
        before={original?.markdown ?? ''}
        after={compared}
        {projectId}
        beforeLabel={'Current version'}
        afterLabel={'Your version'}
      />
    </section>
  {/if}
{/if}

<style>
  .docs-editor-eyebrow {
    margin-bottom: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .docs-editor {
    display: grid;
    gap: 20px;
    max-width: 1000px;
  }
  .docs-editor-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
  .docs-editor-fields input,
  .docs-editor-fields textarea {
    margin-bottom: 6px;
  }
  .docs-editor-fields textarea {
    min-height: 90px;
  }
  .docs-editor-content {
    min-width: 0;
  }
  .docs-editor-visibility {
    display: grid;
    align-content: start;
    gap: 8px;
    padding-top: 18px;
  }
  .docs-check {
    font-size: 13px;
    color: var(--ink);
  }
  .field-help {
    display: flex;
    gap: 6px;
    align-items: baseline;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .field-help :global(svg) {
    flex-shrink: 0;
    align-self: center;
  }
  .field-help code {
    font-family: var(--mono);
    font-size: 11px;
  }
  .docs-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
  .docs-editor-compare {
    display: grid;
    gap: 14px;
    max-width: 1000px;
    margin-top: 28px;
  }
  .docs-editor-compare h2 {
    font-size: 18px;
  }
  @media (max-width: 760px) {
    .docs-editor-fields {
      grid-template-columns: minmax(0, 1fr);
    }
    .docs-editor-visibility {
      padding-top: 0;
    }
  }
</style>
