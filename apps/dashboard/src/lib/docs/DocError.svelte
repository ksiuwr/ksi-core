<script lang="ts">
  let { code }: { code: string } = $props();
</script>

{#if code}<p class="error" role="alert">
    {#if code === 'REVISION_CONFLICT'}
      {'This page changed while you were editing. Copy your text, reload the page and apply your changes again.'}
    {:else if code === 'DOC_SLUG_TAKEN'}
      {'A page with this address already exists in this workspace.'}
    {:else if code === 'DOC_SLUG_RESERVED'}
      {'This address is reserved. Choose another one.'}
    {:else if code === 'DOC_NOT_FOUND' || code === '404'}
      {'This page does not exist or was moved.'}
    {:else if code === 'PROPOSAL_NOT_FOUND'}
      {'This suggestion does not exist.'}
    {:else if code === 'PROPOSAL_ALREADY_RESOLVED'}
      {'Someone has already reviewed this suggestion.'}
    {:else if code === 'PUBLISH_FORBIDDEN'}
      {'Only workspace leaders can change whether a page is public.'}
    {:else if code === 'NO_CHANGES'}
      {'Nothing changed yet. Edit the page before saving.'}
    {:else if code === 'REASON_REQUIRED'}
      {'Describe why you are suggesting this change.'}
    {:else if code === 'ENGLISH_SOURCE_REQUIRED'}
      {'Write the English text first; translations translate it.'}
    {:else if code === 'FOLDER_NOT_FOUND'}
      {'This folder is unavailable in this workspace. Refresh and choose another folder.'}
    {:else if code === 'FOLDER_NOT_EMPTY'}
      {'Move pages and subfolders out before deleting this folder.'}
    {:else if code === 'FOLDER_IN_USE'}
      {'This folder is used by a pending suggestion. Review or withdraw that suggestion before deleting it.'}
    {:else if code === 'FOLDER_NAME_TAKEN'}
      {'A folder with this English name already exists inside the selected parent folder.'}
    {:else if code === 'FOLDER_NAME_INVALID'}
      {'Enter a folder name without “/”. Choose its parent folder separately.'}
    {:else if code === 'FOLDER_CYCLE'}
      {'A folder cannot be placed inside itself or one of its subfolders.'}
    {:else if code === 'FORBIDDEN'}
      {'You do not have permission to do this.'}
    {:else}
      {'Something went wrong. Try again.'}
    {/if}
  </p>{/if}
