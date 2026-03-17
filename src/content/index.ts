type ExtensionSettings = {
  grayscaleThumbnails: boolean;
  hideShorts: boolean;
  replaceThumbnails: boolean;
  articleMode: boolean;
};

const defaultSettings: ExtensionSettings = {
  grayscaleThumbnails: true,
  hideShorts: true,
  replaceThumbnails: true,
  articleMode: true,
};

const styleId = "sumtube-style";
const articleId = "sumtube-article-mode";

void initialize();

async function initialize() {
  const settings = (await chrome.storage.sync.get(
    defaultSettings,
  )) as ExtensionSettings;
  injectStyles(settings);
  applyDetox(settings);

  const observer = new MutationObserver(() => applyDetox(settings));
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectStyles(settings: ExtensionSettings) {
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    html.sumtube-active ytd-reel-shelf-renderer,
    html.sumtube-active ytd-rich-shelf-renderer[is-shorts],
    html.sumtube-active a[href^="/shorts/"],
    html.sumtube-active a[href*="/shorts/"] {
      display: ${settings.hideShorts ? "none !important" : "initial"};
    }

    html.sumtube-active ytd-thumbnail img,
    html.sumtube-active ytd-playlist-thumbnail img {
      filter: ${settings.grayscaleThumbnails ? "grayscale(1) contrast(0.92)" : "none"};
    }

    .sumtube-summary-card,
    #${articleId} {
      font-family: Georgia, 'Times New Roman', serif;
      color: #181512;
      background: linear-gradient(180deg, rgba(246, 240, 231, 0.96), rgba(237, 229, 216, 0.96));
      border: 1px solid rgba(24, 21, 18, 0.14);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
    }

    .sumtube-summary-card {
      display: grid;
      gap: 10px;
      min-height: 120px;
      border-radius: 18px;
      padding: 16px;
      margin: 8px 0;
      overflow: hidden;
    }

    .sumtube-summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #9a3f1d;
      font-weight: 700;
    }

    .sumtube-summary-copy {
      font-size: 15px;
      line-height: 1.45;
    }

    html.sumtube-active #movie_player,
    html.sumtube-active ytd-player,
    html.sumtube-active .html5-video-player {
      display: ${settings.articleMode ? "none !important" : "initial"};
    }

    #${articleId} {
      border-radius: 24px;
      padding: 22px;
      margin-bottom: 24px;
      white-space: pre-wrap;
      line-height: 1.7;
    }

    #${articleId} h2 {
      margin: 0 0 12px;
      font-size: 28px;
      line-height: 1.1;
    }
  `;

  document.documentElement.classList.add("sumtube-active");
  document.head.append(style);
}

function applyDetox(settings: ExtensionSettings) {
  if (settings.replaceThumbnails) {
    replaceFeedCards();
  }

  if (settings.articleMode) {
    void injectArticleMode();
  }
}

function replaceFeedCards() {
  const renderers = document.querySelectorAll<HTMLElement>(
    "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer",
  );

  for (const renderer of renderers) {
    if (renderer.dataset.sumtubeProcessed === "true") {
      continue;
    }

    const titleNode = renderer.querySelector<HTMLElement>(
      "#video-title, #video-title-link",
    );
    const thumbNode = renderer.querySelector<HTMLElement>(
      "ytd-thumbnail, a#thumbnail",
    );
    const title = titleNode?.textContent?.trim();

    if (!title || !thumbNode) {
      continue;
    }

    const card = document.createElement("div");
    card.className = "sumtube-summary-card";

    const label = document.createElement("div");
    label.className = "sumtube-summary-label";
    label.textContent = "AI summary preview";

    const copy = document.createElement("div");
    copy.className = "sumtube-summary-copy";
    copy.textContent = "Loading summary...";

    card.append(label, copy);
    thumbNode.replaceChildren(card);
    renderer.dataset.sumtubeProcessed = "true";

    const videoId = getVideoId(renderer);

    chrome.runtime.sendMessage(
      { type: "SUMMARIZE_VIDEO", videoId, title },
      (response?: { summary?: string }) => {
        if (chrome.runtime.lastError) {
          copy.textContent =
            "Summary unavailable. Background worker is not responding yet.";
          return;
        }

        copy.textContent = response?.summary ?? "No summary returned.";
      },
    );
  }
}

async function injectArticleMode() {
  if (!location.pathname.startsWith("/watch")) {
    return;
  }

  const articleHost = document.querySelector<HTMLElement>("#primary-inner");
  const titleNode = document.querySelector<HTMLElement>(
    "h1.ytd-watch-metadata yt-formatted-string",
  );

  if (!articleHost || !titleNode) {
    return;
  }

  let article = document.getElementById(articleId);
  if (article) {
    return;
  }

  article = document.createElement("article");
  article.id = articleId;
  article.textContent = "Building article version...";
  articleHost.prepend(article);

  const title =
    titleNode.textContent?.trim() || document.title.replace(" - YouTube", "");
  const videoId =
    new URL(location.href).searchParams.get("v") || "unknown-video";
  const response = (await chrome.runtime.sendMessage({
    type: "ARTICLE_VIDEO",
    videoId,
    title,
  })) as { article?: string };

  article.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const body = document.createElement("div");
  body.textContent = response?.article ?? "No article returned.";
  article.append(heading, body);
}

function getVideoId(scope: ParentNode) {
  const thumbLink = scope.querySelector<HTMLAnchorElement>(
    'a#thumbnail[href*="watch?v="], a[href*="watch?v="]',
  );

  if (!thumbLink) {
    return "unknown-video";
  }

  const url = new URL(thumbLink.href, location.origin);
  return url.searchParams.get("v") || "unknown-video";
}
