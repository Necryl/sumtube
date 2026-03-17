type SummaryRequest = {
  type: "SUMMARIZE_VIDEO";
  videoId: string;
  title: string;
};

type ArticleRequest = {
  type: "ARTICLE_VIDEO";
  videoId: string;
  title: string;
};

type AuthStatusRequest = {
  type: "AUTH_STATUS";
};

type AuthSignInRequest = {
  type: "AUTH_SIGN_IN";
};

type AuthSignOutRequest = {
  type: "AUTH_SIGN_OUT";
};

type ExtensionMessage =
  | SummaryRequest
  | ArticleRequest
  | AuthStatusRequest
  | AuthSignInRequest
  | AuthSignOutRequest;

type AuthState = {
  isAuthenticated: boolean;
  email: string;
};

type ExtensionResponse = {
  summary?: string;
  article?: string;
  auth?: AuthState;
  error?: string;
};

const storageDefaults = {
  oauthAccountEmail: "",
};

async function getAuthToken(interactive: boolean) {
  return new Promise<string>((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (result) => {
      const token = typeof result === "string" ? result : result?.token;

      if (chrome.runtime.lastError || !token) {
        reject(
          new Error(
            chrome.runtime.lastError?.message ||
              "Unable to acquire OAuth token.",
          ),
        );
        return;
      }

      resolve(token);
    });
  });
}

async function removeCachedAuthToken(token: string) {
  return new Promise<void>((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function clearAllCachedAuthTokens() {
  return new Promise<void>((resolve, reject) => {
    chrome.identity.clearAllCachedAuthTokens(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function fetchGoogleProfile(token: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google profile request failed (${response.status}).`);
  }

  const profile = (await response.json()) as { email?: string };

  if (!profile.email) {
    throw new Error("Google profile did not include an email address.");
  }

  return {
    email: profile.email,
  };
}

async function setStoredAccount(email: string) {
  await chrome.storage.sync.set({ oauthAccountEmail: email });
}

async function clearStoredAccount() {
  await chrome.storage.sync.remove("oauthAccountEmail");
}

async function getStoredAccount() {
  const stored = await chrome.storage.sync.get(storageDefaults);
  return String(stored.oauthAccountEmail || "");
}

async function getAuthState(interactive: boolean): Promise<AuthState> {
  try {
    const token = await getAuthToken(interactive);
    const profile = await fetchGoogleProfile(token);
    await setStoredAccount(profile.email);

    return {
      isAuthenticated: true,
      email: profile.email,
    };
  } catch {
    const fallbackEmail = await getStoredAccount();

    return {
      isAuthenticated: false,
      email: fallbackEmail,
    };
  }
}

async function signOut(): Promise<AuthState> {
  try {
    const token = await getAuthToken(false);
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    await removeCachedAuthToken(token);
  } catch {
    // Ignore missing/expired token state.
  }

  try {
    await clearAllCachedAuthTokens();
  } catch {
    // Ignore if Chrome has no cached token state yet.
  }

  await clearStoredAccount();

  return {
    isAuthenticated: false,
    email: "",
  };
}

function sentenceSeed(input: string) {
  return input.replace(/\s+/g, " ").trim().split(" ").slice(0, 12).join(" ");
}

function buildSummary(title: string) {
  const seed = sentenceSeed(title);

  return `Short summary placeholder for "${seed}". This is where the Gemini summary will be returned once the background worker is connected to the model.`;
}

function buildArticle(title: string) {
  const seed = sentenceSeed(title);

  return [
    `Article mode placeholder for "${seed}".`,
    "Opening: this video likely introduces a core topic, the promised payoff, and why it matters.",
    "Middle: this is where your Gemini conversion should extract the main claims, examples, and caveats into short readable paragraphs.",
    "Takeaway: finish with a compact recap and a few action points so the page rewards reading instead of autoplay.",
  ].join("\n\n");
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("SumTube installed");
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    void (async () => {
      if (message.type === "SUMMARIZE_VIDEO") {
        sendResponse({ summary: buildSummary(message.title) });
        return;
      }

      if (message.type === "ARTICLE_VIDEO") {
        sendResponse({ article: buildArticle(message.title) });
        return;
      }

      if (message.type === "AUTH_STATUS") {
        sendResponse({ auth: await getAuthState(false) });
        return;
      }

      if (message.type === "AUTH_SIGN_IN") {
        sendResponse({ auth: await getAuthState(true) });
        return;
      }

      if (message.type === "AUTH_SIGN_OUT") {
        sendResponse({ auth: await signOut() });
        return;
      }

      sendResponse({ error: "Unsupported message type" });
    })().catch((error) => {
      sendResponse({
        error:
          error instanceof Error
            ? error.message
            : "An unexpected background error occurred.",
      });
    });

    return true;
  },
);
