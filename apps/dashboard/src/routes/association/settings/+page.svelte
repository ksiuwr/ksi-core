<script lang="ts">
  import AssociationAlerts from '$lib/AssociationAlerts.svelte';
  let { data } = $props();
</script>

<AssociationAlerts alerts={data.alerts} page={data.alertPage} websiteOrigin={data.websiteOrigin} />
