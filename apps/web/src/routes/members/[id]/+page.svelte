<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import { Github, Linkedin } from '@lucide/svelte';
  import { Avatar, Button, Card, Grid, HStack, Heading, Icon, Text, VStack } from '@astryx-sv/core';
  let { data } = $props<{ data: import('./$types').PageData }>();
</script>

<svelte:head><title>{data.member.name} · KSI UWr</title></svelte:head>

{#snippet githubIcon()}
  <Icon icon={Github} size="sm" />
{/snippet}

{#snippet linkedinIcon()}
  <Icon icon={Linkedin} size="sm" />
{/snippet}

<VStack as="main" gap={0} paddingBlockStart={10} class="page-container w-full flex-1 pb-20">
  <VStack gap={0} maxWidth={896} class="mx-auto w-full">
    <Card padding={6} class="relative overflow-hidden sm:p-8">
      <div class="profile-backdrop" aria-hidden="true"></div>
      <Grid columns={{ minWidth: 420, max: 2 }} gap={6} align="center" class="relative">
        <Avatar src={data.member.image ?? undefined} name={data.member.name} size={96} />
        <VStack gap={1} class="min-w-0">
          <Heading level={1} type="display-1" textWrap="balance">{data.member.name}</Heading>
          {#if data.member.nickname}
            <Text type="code" color="secondary">aka. {data.member.nickname}</Text>
          {/if}
        </VStack>
      </Grid>
      {#if data.member.bio}
        <Text as="p" color="secondary" class="relative mt-6 max-w-2xl whitespace-pre-wrap">
          {data.member.bio}
        </Text>
      {/if}
      {#if data.member.github || data.member.linkedin}
        <HStack gap={2} wrap="wrap" class="relative mt-6">
          {#if data.member.github}
            <Button
              href={data.member.github}
              variant="secondary"
              label="GitHub"
              icon={githubIcon}
              target="_blank"
              rel="noopener noreferrer"
            />
          {/if}
          {#if data.member.linkedin}
            <Button
              href={data.member.linkedin}
              variant="secondary"
              label="LinkedIn"
              icon={linkedinIcon}
              target="_blank"
              rel="noopener noreferrer"
            />
          {/if}
        </HStack>
      {/if}
    </Card>

    <VStack as="section" gap={6} class="mt-12" aria-labelledby="member-articles-heading">
      <Heading level={2} id="member-articles-heading">Artykuły</Heading>
      <ArticleList articles={data.member.articles} />
    </VStack>
  </VStack>
</VStack>

<style>
  .profile-backdrop {
    position: absolute;
    inset: 0 0 auto;
    height: 96px;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 14%, transparent) 1px,
      transparent 1px
    );
    background-size: 18px 18px;
    mask-image: linear-gradient(to bottom, #000, transparent);
  }
</style>
