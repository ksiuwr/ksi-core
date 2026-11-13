<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowLeft } from '@lucide/svelte';
  import { Button, Card, Heading, Icon, Text, VStack } from '@astryx-sv/core';
</script>

<svelte:head>
  <title>{page.status} · KSI UWr</title>
</svelte:head>

{#snippet backIcon()}
  <Icon icon={ArrowLeft} size="sm" />
{/snippet}

<VStack
  as="main"
  gap={0}
  paddingBlock={10}
  class="error-page relative isolate flex-1 items-center justify-center overflow-hidden"
>
  <VStack gap={0} class="page-container w-full">
    <VStack gap={4} hAlign="center" maxWidth={576} class="mx-auto">
      <Text
        as="p"
        type="display-1"
        justify="center"
        class="status font-display w-full leading-none font-bold"
        aria-hidden="true"
      >
        {page.status}
      </Text>
      <Heading level={1} type="display-2" textWrap="balance" justify="center" class="mt-4">
        Nie udało się wczytać tej strony.
      </Heading>
      <Text type="large" color="secondary" justify="center">
        Spróbuj ponownie lub wróć na stronę główną.
      </Text>
      <Button
        href={resolve('/')}
        variant="primary"
        size="lg"
        label="Wróć na stronę główną"
        icon={backIcon}
        class="mt-4"
      />
      <Card variant="muted" padding={3} width="100%" class="mt-6">
        <Text type="code" color="secondary" justify="center" class="wrap-anywhere">
          {page.error?.message ||
            'Strona mogła zostać przeniesiona lub wystąpił błąd podczas jej wczytywania.'}
        </Text>
      </Card>
    </VStack>
  </VStack>
</VStack>

<style>
  :global(.error-page)::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 14%, transparent) 1px,
      transparent 1px
    );
    background-size: 22px 22px;
    mask-image: radial-gradient(ellipse 50% 50% at 50% 40%, #000, transparent 80%);
  }
  :global(.status) {
    width: 100%;
    color: var(--color-text-primary);
    font-size: clamp(4.5rem, 16vw, 9rem);
    line-height: 0.9;
    letter-spacing: -0.04em;
    text-align: center;
    overflow: visible;
  }
</style>
