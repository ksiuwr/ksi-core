<script lang="ts">
  import { page } from '$app/state';
  import { Badge, Button, Card, Heading, Text, VStack } from '@astryx-sv/core';

  const isAuthError = $derived(page.status === 401 || page.status === 403);
  const message = $derived(page.error?.message || 'Wystąpił nieoczekiwany błąd podczas żądania.');
</script>

<svelte:head>
  <title>{page.status} · Panel KSI</title>
</svelte:head>

<VStack minHeight="60dvh" vAlign="center" hAlign="center" padding={4}>
  <Card padding={6} maxWidth={460}>
    <VStack gap={4} hAlign="center">
      <Badge variant="error" label={`Błąd ${page.status}`} />
      <Heading level={1} justify="center">
        {isAuthError ? 'Błąd uwierzytelniania' : 'Błąd'}
      </Heading>
      <Text color="secondary" justify="center">{message}</Text>
      <Button href="/" label="Wróć do Panelu" variant="secondary" />
    </VStack>
  </Card>
</VStack>
