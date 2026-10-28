<script lang="ts">
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  let {
    member,
    href,
    role
  }: {
    member: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      nickname?: string | null;
      image?: string | null;
      bio?: string | null;
    };
    href: string;
    role: string;
  } = $props();
</script>

<MemberPreview {member} {href} {role} />
