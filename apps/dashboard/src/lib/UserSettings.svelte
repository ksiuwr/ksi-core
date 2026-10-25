<script lang="ts">
  import { SunMoon } from '@lucide/svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import NotificationSettings from './NotificationSettings.svelte';
  import { preferences, setLanguage, setTheme, type ThemePreference } from './preferences.svelte';
  let { language }: { language: 'pl' | 'en' } = $props();
</script>

<div class="workspace-header">
  <div>
    <h1>{'Settings'}</h1>
    <p class="workspace-description">{'Manage your language, appearance, and notifications.'}</p>
  </div>
</div>
<div class="settings-sections">
  <section class="card appearance-settings" aria-labelledby="appearance-heading">
    <div class="section-heading">
      <SunMoon size={18} aria-hidden="true" />
      <h2 id="appearance-heading">{'Language and appearance'}</h2>
    </div>
    <div class="settings-fields">
      <div>
        <label for="dashboard-language">{'Language'}</label><Dropdown
          id="dashboard-language"
          label={'Language'}
          value={language}
          options={[
            { value: 'pl', label: 'Polski' },
            { value: 'en', label: 'English' }
          ]}
          onselect={(value) => setLanguage(value as 'pl' | 'en')}
        />
      </div>
      <div>
        <label for="dashboard-theme">{'Appearance'}</label><Dropdown
          id="dashboard-theme"
          label={'Appearance'}
          value={preferences.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' }
          ]}
          onselect={(value) => setTheme(value as ThemePreference)}
        />
      </div>
    </div>
    <p class="field-help">
      {'Language and appearance changes are saved automatically on this device.'}
    </p>
  </section>
  <NotificationSettings {language} />
</div>

<style>
  .settings-sections {
    display: grid;
    gap: 24px;
    max-width: 720px;
  }
  .appearance-settings {
    padding: 24px;
  }
  .settings-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
  @media (max-width: 600px) {
    .settings-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
