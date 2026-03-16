<script lang="ts">
  import { onMount } from 'svelte'

  type ExtensionSettings = {
    geminiApiKey: string
    grayscaleThumbnails: boolean
    hideShorts: boolean
    replaceThumbnails: boolean
    articleMode: boolean
  }

  const defaultSettings: ExtensionSettings = {
    geminiApiKey: '',
    grayscaleThumbnails: true,
    hideShorts: true,
    replaceThumbnails: true,
    articleMode: true,
  }

  let settings = $state<ExtensionSettings>({ ...defaultSettings })
  let status = $state('Ready to configure the extension.')

  onMount(async () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      status = 'Chrome extension APIs are not available in this preview.'
      return
    }

    const stored = (await chrome.storage.sync.get(defaultSettings)) as ExtensionSettings
    settings = {
      geminiApiKey: String(stored.geminiApiKey ?? ''),
      grayscaleThumbnails: Boolean(stored.grayscaleThumbnails ?? true),
      hideShorts: Boolean(stored.hideShorts ?? true),
      replaceThumbnails: Boolean(stored.replaceThumbnails ?? true),
      articleMode: Boolean(stored.articleMode ?? true),
    }
  })

  async function saveSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      status = 'Open this as an extension popup to persist settings.'
      return
    }

    await chrome.storage.sync.set(settings)
    status = 'Settings saved. Reload the extension in Chrome to apply changes.'
  }
</script>

<main class="shell">
  <section class="hero">
    <p class="eyebrow">SumTube</p>
    <h1>YouTube with friction.</h1>
    <p class="lede">
      This popup stores the rules that your content script uses to desaturate thumbnails,
      hide Shorts, replace feed cards with summaries, and swap the watch page for article mode.
    </p>
  </section>

  <section class="panel">
    <label class="field">
      <span>Gemini API key</span>
      <input
        bind:value={settings.geminiApiKey}
        type="password"
        placeholder="Paste a key for later background-worker integration"
      />
    </label>

    <label class="toggle">
      <input bind:checked={settings.grayscaleThumbnails} type="checkbox" />
      <span>Make remaining thumbnails grayscale</span>
    </label>

    <label class="toggle">
      <input bind:checked={settings.hideShorts} type="checkbox" />
      <span>Hide Shorts entry points and shelf modules</span>
    </label>

    <label class="toggle">
      <input bind:checked={settings.replaceThumbnails} type="checkbox" />
      <span>Replace feed thumbnails with text summary cards</span>
    </label>

    <label class="toggle">
      <input bind:checked={settings.articleMode} type="checkbox" />
      <span>Hide the player and show article mode on watch pages</span>
    </label>

    <button onclick={saveSettings} type="button">Save settings</button>
    <p class="status">{status}</p>
  </section>

  <section class="notes">
    <h2>What is wired up now</h2>
    <ul>
      <li>Manifest V3 scaffold with popup, background worker, and YouTube content script.</li>
      <li>Content script detoxes the page with placeholders so you can test the extension flow.</li>
      <li>Background worker exposes message handlers where Gemini summarization will go next.</li>
    </ul>
  </section>
</main>
