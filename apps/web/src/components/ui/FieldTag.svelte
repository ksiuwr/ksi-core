<script lang="ts">
  import FieldName from './FieldName.svelte';

  let { field }: { field: string } = $props();
</script>

<span class="tag field-tag" data-field={field}><FieldName {field} /></span>
