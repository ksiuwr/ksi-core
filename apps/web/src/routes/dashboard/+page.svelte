<script lang="ts">
  import { ArrowUpRight, Megaphone, TableProperties } from '@lucide/svelte';
  import { ClickableCard, Grid, HStack, Heading, Icon, Text, VStack } from '@astryx-sv/core';
  import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet hero()}
  <VStack as="header" gap={6} paddingBlockEnd={10} class="border-line border-b">
    <Heading level={1} type="display-1" class="max-w-4xl">Panel</Heading>
    <Text type="large" color="secondary" class="max-w-2xl">
      Zarządzaj ogłoszeniami publicznymi i wykonuj inne zadania.
    </Text>
  </VStack>
{/snippet}

<Wrapper name="dashboard" {hero}>
  <VStack as="section" gap={8} paddingBlock={10} aria-labelledby="tools-heading">
    <HStack gap={6} justify="between" vAlign="end" wrap="wrap">
      <VStack gap={3}>
        <Text type="code" color="accent" class="tracking-wider uppercase">01 / Narzędzia</Text>
        <Heading level={2} id="tools-heading">Wybierz obszar roboczy</Heading>
      </VStack>
      <Text type="code" color="secondary" class="hidden sm:block">Dostępne moduły: 2</Text>
    </HStack>

    <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
      <ClickableCard href="/dashboard/alerts" label="Alerty" padding={6} elevation="low">
        <VStack gap={6} minHeight={288}>
          <HStack justify="between" vAlign="start">
            <Text type="code" color="secondary" class="tracking-wider uppercase">Moduł / 01</Text>
            <Icon icon={ArrowUpRight} size="md" color="secondary" />
          </HStack>
          <VStack gap={4} class="my-auto">
            <Icon icon={Megaphone} size="lg" color="accent" />
            <Heading level={3}>Alerty</Heading>
            <Text color="secondary" class="max-w-md">
              Twórz, planuj, edytuj i usuwaj komunikaty wyświetlane odwiedzającym w całej witrynie.
            </Text>
          </VStack>
          <Text type="label" color="accent" class="tracking-wider uppercase">
            Zarządzaj alertami →
          </Text>
        </VStack>
      </ClickableCard>

      <ClickableCard
        href="/dashboard/s3cache"
        label="Pamięć podręczna S3"
        padding={6}
        elevation="low"
      >
        <VStack gap={6} minHeight={288}>
          <HStack justify="between" vAlign="start">
            <Text type="code" color="secondary" class="tracking-wider uppercase">Moduł / 02</Text>
            <Icon icon={ArrowUpRight} size="md" color="secondary" />
          </HStack>
          <VStack gap={4} class="my-auto">
            <Icon icon={TableProperties} size="lg" color="secondary" />
            <Heading level={3}>Pamięć podręczna S3</Heading>
            <Text color="secondary" class="max-w-md">
              Przeglądaj listy obiektów Cloudflare R2 zapisane w pamięci podręcznej i w razie
              potrzeby odświeżaj poszczególne klucze.
            </Text>
          </VStack>
          <Text type="label" color="accent" class="tracking-wider uppercase">
            Przejrzyj pamięć podręczną →
          </Text>
        </VStack>
      </ClickableCard>
    </Grid>
  </VStack>
</Wrapper>
