<script lang="ts">
  import { onMount } from 'svelte'

  type ExtensionSettings = {
    grayscaleThumbnails: boolean
    hideShorts: boolean
    replaceThumbnails: boolean
    articleMode: boolean
  }

  type AuthState = {
    isAuthenticated: boolean
    email: string
  }

  type BackgroundResponse = {
    auth?: AuthState
    error?: string
  }

  const defaultSettings: ExtensionSettings = {
    grayscaleThumbnails: true,
    hideShorts: true,
    replaceThumbnails: true,
    articleMode: true,
  }

  let settings = $state<ExtensionSettings>({ ...defaultSettings })
  let auth = $state<AuthState>({ isAuthenticated: false, email: '' })
  let isAuthBusy = $state(false)
  let status = $state('Connect a Google account to prepare OAuth-based Gemini access.')

  onMount(async () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      status = 'Chrome extension APIs are not available in this preview.'
      return
    }

    const stored = (await chrome.storage.sync.get(defaultSettings)) as ExtensionSettings
    settings = {
      grayscaleThumbnails: Boolean(stored.grayscaleThumbnails ?? true),
      hideShorts: Boolean(stored.hideShorts ?? true),
      replaceThumbnails: Boolean(stored.replaceThumbnails ?? true),
      articleMode: Boolean(stored.articleMode ?? true),
    }

    await refreshAuthStatus()
  })

  async function saveSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      status = 'Open this as an extension popup to persist settings.'
      return
    }

    await chrome.storage.sync.set(settings)
    status = 'Settings saved. Reload the extension in Chrome to apply changes.'
  }

  async function sendBackgroundMessage(type: 'AUTH_STATUS' | 'AUTH_SIGN_IN' | 'AUTH_SIGN_OUT') {
    const response = (await chrome.runtime.sendMessage({ type })) as BackgroundResponse
    return response
  }

  async function refreshAuthStatus() {
    const response = await sendBackgroundMessage('AUTH_STATUS')

    if (response.error) {
      status = `Auth check failed: ${response.error}`
      return
    }

    if (response.auth) {
      auth = response.auth
      status = response.auth.isAuthenticated
        ? `Signed in as ${response.auth.email}.`
        : 'Not signed in. Use Google sign-in below.'
    }
  }

  async function signIn() {
    isAuthBusy = true

    try {
      const response = await sendBackgroundMessage('AUTH_SIGN_IN')

      if (response.error) {
        status = `Sign-in failed: ${response.error}`
        return
      }

      if (response.auth) {
        auth = response.auth
        status = response.auth.isAuthenticated
          ? `Signed in as ${response.auth.email}.`
          : 'Sign-in did not complete.'
      }
    } finally {
      isAuthBusy = false
    }
  }

  async function signOut() {
    isAuthBusy = true

    try {
      const response = await sendBackgroundMessage('AUTH_SIGN_OUT')

      if (response.error) {
        status = `Sign-out failed: ${response.error}`
        return
      }

      if (response.auth) {
        auth = response.auth
        status = 'Signed out.'
      }
    } finally {
      isAuthBusy = false
    }
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
    <div class="auth-card">
      <p class="auth-title">Google account</p>
      <p class="auth-copy">
        OAuth identity is handled via Chrome Identity API. This gives SumTube an account-aware token
        flow that can follow account switching through sign-in/sign-out.
      </p>

      <div class="auth-row">
        <span class:connected={auth.isAuthenticated} class="auth-pill">
          {auth.isAuthenticated ? `Connected: ${auth.email}` : 'Not connected'}
        </span>

        {#if auth.isAuthenticated}
          <button onclick={signOut} type="button" disabled={isAuthBusy}>Disconnect</button>
        {:else}
          <button onclick={signIn} type="button" disabled={isAuthBusy}>Sign in with Google</button>
        {/if}
      </div>
    </div>

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
      <li>OAuth status/sign-in/sign-out messaging through Chrome Identity API is implemented.</li>
      <li>Summary/article responses are still placeholders until Gemini API calls are attached.</li>
    </ul>
  </section>
</main>
