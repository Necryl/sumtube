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

type ExtensionMessage = SummaryRequest | ArticleRequest;
type ExtensionResponse = {
  summary?: string;
  article?: string;
  error?: string;
};

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
    if (message.type === "SUMMARIZE_VIDEO") {
      sendResponse({ summary: buildSummary(message.title) });
      return false;
    }

    if (message.type === "ARTICLE_VIDEO") {
      sendResponse({ article: buildArticle(message.title) });
      return false;
    }

    sendResponse({ error: "Unsupported message type" });
    return false;
  },
);
