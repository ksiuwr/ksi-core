<script lang="ts">
  import { Heading, HStack, StatusDot, Text, VStack } from '@astryx-sv/core';
  import ArticleList from '$lib/components/ArticleList.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
</script>

<svelte:head><title>Artykuły · KSI UWr</title></svelte:head>

<VStack as="main" gap={0} class="flex-1">
  <VStack as="header" gap={4} class="border-line border-b py-14 md:py-20">
    <VStack gap={4} class="page-container w-full">
      <HStack gap={2} vAlign="center">
        <StatusDot variant="accent" label="Blog" />
        <Text type="code" color="secondary" class="tracking-wider uppercase">Blog</Text>
      </HStack>
      <Heading level={1} type="display-1">Artykuły</Heading>
      <Text type="large" color="secondary" class="max-w-xl">
        Aktualności, artykuły i relacje członków KSI.
      </Text>
    </VStack>
  </VStack>
  <VStack gap={0} paddingBlock={10} class="page-container w-full pb-20">
    <VStack gap={0} maxWidth={896} class="w-full">
      <ArticleList articles={data.articles} />
    </VStack>
  </VStack>
</VStack>
