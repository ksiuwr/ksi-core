import { frontendLocales } from '../../packages/shared/content-locales.ts';
// @ts-check
import { adapter as svelte } from '@wuchale/svelte';
import { defineConfig } from 'wuchale';

export default defineConfig({
  locales: [...frontendLocales],
  adapters: {
    main: svelte({
      loader: 'svelte',
      files: [
        'src/**/*.svelte',
        'src/**/*.svelte.{js,ts}',
        '../../packages/ui/src/lib/platform/ChangeDetails.svelte',
        '../../packages/ui/src/lib/platform/DateTimePicker.svelte',
        '../../packages/ui/src/lib/platform/DateTimeRangePicker.svelte',
        '../../packages/ui/src/lib/platform/Dropdown.svelte',
        '../../packages/ui/src/lib/platform/Editor.svelte',
        '../../packages/ui/src/lib/platform/GalleryEditor.svelte',
        '../../packages/ui/src/lib/platform/GalleryImage.svelte',
        '../../packages/ui/src/lib/platform/Markdown.svelte',
        '../../packages/ui/src/lib/platform/MarkdownContent.svelte',
        '../../packages/ui/src/lib/platform/MemberPreview.svelte',
        '../../packages/ui/src/lib/platform/TreeLabel.svelte',
        '../../packages/ui/src/lib/platform/DocsToc.svelte',
        '../../packages/ui/src/lib/platform/DocsOutline.svelte'
      ]
    })
  }
});
