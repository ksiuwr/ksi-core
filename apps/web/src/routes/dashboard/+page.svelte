<script lang="ts">
  import { Wrench } from '@lucide/svelte';
  import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet dashboardIcon()}
  <Wrench class="size-4" />
{/snippet}

<Wrapper name="dashboard/HOME.md" icon={dashboardIcon}>
  <div class="markdown-file">
    <h1>Panel</h1>
    <a href="/dashboard/alerts" class="btn"> Alerts </a>
    <a href="/dashboard/s3cache" class="btn"> S3 Cache </a>
  </div>
</Wrapper>
