(() => {
  const API_BASE = "/api";
  const DRAFT_STORAGE_KEY = "taletinker:story-draft";
  const RESUME_STORAGE_KEY = "taletinker:resume-after-login";
  const CHOICE_TIMEOUT_SECONDS = 15;

  const INITIAL_SENTENCES = [
    "Once upon a time, in a land made entirely of candy, a little gummy bear woke up with a big idea.",
    "The friendly dragon sneezed, and instead of fire, bubbles came out!",
    "Max the puppy found a magical bone that could talk.",
    "In the middle of the fluffy cloud kingdom, a rainbow bridge suddenly appeared.",
    "The robot toy winked at Timmy and whispered, 'Let's go on an adventure!'",
    "A tiny mouse found a helmet that was way too big for him, but perfect for a knight.",
    "The stars in the sky decided to come down and play hide and seek.",
    "Princess Lily found a door in the old oak tree that wasn't there yesterday.",
  ];

  const root = document.getElementById("app");
  const state = {
    viewMode: "home",
    selectedStoryId: null,
    previousStoryId: null,
    runtimeStories: [],
    stories: [],
    activeStory: null,
    showTreeView: false,
    nodes: {},
    headId: null,
    suggestions: [],
    isLoadingSuggestions: false,
    isCheckingLine: false,
    lineCheckMessage: null,
    lineCheckTone: null,
    isEnded: false,
    minStoryLines: 5,
    anonSigninLine: 3,
    storyTitle: "",
    storyTagline: "",
    savedStoryId: null,
    isLoadingStoryMeta: false,
    isSavingStory: false,
    isLoggedIn: false,
    userEmail: null,
    displayName: null,
    showAuthModal: false,
    authStatus: "idle",
    authEmail: "",
    authError: null,
    showProfileModal: false,
    displayNameDraft: "",
    displayNameError: null,
    isUpdatingDisplayName: false,
    shareStatus: "idle",
    openAlternativeLineId: null,
    starterPrompts: shuffle(INITIAL_SENTENCES).slice(0, 2),
  };

  let suggestionRequestId = 0;
  let hasResumedDraft = false;
  let choiceTimerId = null;
  let choiceTimerKey = "";
  let timeLeft = CHOICE_TIMEOUT_SECONDS;
  let isTimerPaused = false;
  let shouldScrollBottom = false;
  let shareResetId = null;

  const api = {
    listStories: () => fetchJson(`${API_BASE}/stories/`, { method: "GET" }, "Failed to fetch stories"),
    getStory: (id) => fetchJson(`${API_BASE}/stories/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to fetch story"),
    createStory: (data) => fetchJson(`${API_BASE}/stories/`, jsonOptions("POST", data), "Failed to create story"),
    suggestLines: (context) => fetchJson(`${API_BASE}/stories/suggest`, jsonOptions("POST", { context }), "Failed to fetch suggestions"),
    suggestStoryMeta: (context) => fetchJson(`${API_BASE}/stories/suggest-meta`, jsonOptions("POST", { context }), "Failed to fetch story meta"),
    updateStoryMeta: (id, data) => fetchJson(`${API_BASE}/stories/${encodeURIComponent(id)}`, jsonOptions("PATCH", data), "Failed to update story meta"),
    requestMagicLink: (email) => fetchJson(`${API_BASE}/auth/login`, jsonOptions("POST", { email }), "Failed to request magic link"),
    checkLine: (line, context) => fetchJson(`${API_BASE}/stories/check-line`, jsonOptions("POST", { line, context }), "Failed to check line"),
    getStoryConfig: () => fetchJson(`${API_BASE}/stories/config`, { method: "GET" }, "Failed to fetch story config"),
    getMe: () => fetchJson(`${API_BASE}/auth/me`, { method: "GET" }, "Failed to fetch user"),
    updateDisplayName: (displayName) => fetchJson(`${API_BASE}/auth/display-name`, jsonOptions("POST", { display_name: displayName }), "Failed to update display name"),
    logout: () => fetchJson(`${API_BASE}/auth/logout`, { method: "POST" }, "Failed to logout"),
    likeStory: (id) => fetchJson(`${API_BASE}/stories/${encodeURIComponent(id)}/like`, { method: "POST" }, "Failed to like story"),
    likeLine: (id) => fetchJson(`${API_BASE}/stories/lines/${encodeURIComponent(id)}/like`, { method: "POST" }, "Failed to like line"),
  };

  function jsonOptions(method, data) {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  }

  async function fetchJson(url, options, errorMessage) {
    const response = await fetch(url, { credentials: "include", ...options });
    if (!response.ok) {
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function h(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shuffle(values) {
    return [...values].sort(() => 0.5 - Math.random());
  }

  function generateId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function dateLabel(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString();
  }

  function icon(name, className = "w-4 h-4") {
    const icons = {
      arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
      arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
      bookOpen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
      calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
      checkCircle: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      cornerDownRight: '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
      gitFork: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/>',
      gitGraph: '<circle cx="5" cy="6" r="3"/><path d="M5 9v6"/><circle cx="5" cy="18" r="3"/><path d="M12 3v18"/><circle cx="19" cy="6" r="3"/><path d="M16 15.7A9 9 0 0 0 19 9"/>',
      heart: '<path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.1.8-4.5 2.3C10.6 3.8 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/>',
      lifeBuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.2 4.2"/><path d="m14.9 14.9 4.2 4.2"/><path d="m14.9 9.1 4.2-4.2"/><path d="m14.9 9.1 4.2-4.2"/><path d="m4.9 19.1 4.2-4.2"/>',
      loader: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
      logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.9 1.9 0 0 1-2.06 0L2 7"/>',
      pauseCircle: '<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>',
      penTool: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
      pencil: '<path d="M21.2 5.8a2.8 2.8 0 0 0-4-4L3 16v5h5z"/><path d="m14.5 4.5 5 5"/>',
      refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.8 9.8 0 0 0 6.7-2.7L21 16"/><path d="M16 16h5v5"/>',
      rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
      sparkles: '<path d="m12 3-1.9 5.8L4 11l6.1 2.2L12 19l1.9-5.8L20 11l-6.1-2.2z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
      user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ""}</svg>`;
  }

  function currentPath() {
    const path = [];
    let currentId = state.headId;
    while (currentId) {
      const node = state.nodes[currentId];
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;
    }
    return path;
  }

  function buildPathFromDraft(draftNodes, draftHeadId) {
    const path = [];
    let currentId = draftHeadId;
    while (currentId) {
      const node = draftNodes[currentId];
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;
    }
    return path;
  }

  function canEndStory(pathLength) {
    return pathLength >= state.minStoryLines;
  }

  function shouldPreserveDraft() {
    try {
      return window.localStorage.getItem(RESUME_STORAGE_KEY) === "true";
    } catch (error) {
      console.error("Failed to read resume flag", error);
      return false;
    }
  }

  function saveDraft() {
    const path = currentPath();
    if (state.viewMode !== "create" || state.isEnded || !state.headId || path.length === 0) return;
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        version: 1,
        nodes: state.nodes,
        headId: state.headId,
        storyTitle: state.storyTitle,
      }));
    } catch (error) {
      console.error("Failed to save draft", error);
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear draft", error);
    }
  }

  function persistDraft() {
    const path = currentPath();
    if (state.viewMode === "create" && !state.isEnded && path.length > 0) {
      saveDraft();
      return;
    }
    if (state.isEnded || state.viewMode === "read") {
      clearDraft();
      return;
    }
    if (state.viewMode === "home" && !shouldPreserveDraft()) {
      clearDraft();
    }
  }

  function navigateTo(path, replace = false) {
    if (replace) {
      window.history.replaceState(null, "", path);
    } else {
      window.history.pushState(null, "", path);
    }
  }

  function getStoryIdFromPath() {
    const match = window.location.pathname.match(/^\/stories\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function goHome(skipHistory = false) {
    state.viewMode = "home";
    state.selectedStoryId = null;
    state.activeStory = null;
    state.showTreeView = false;
    state.openAlternativeLineId = null;
    if (!skipHistory && window.location.pathname !== "/") {
      navigateTo("/");
    }
    render();
  }

  function render() {
    persistDraft();
    root.innerHTML = `<div class="min-h-screen font-sans selection:bg-primary/20 bg-background text-foreground">${renderView()}${renderAuthModal()}${renderProfileModal()}</div>`;
    afterRender();
  }

  function renderView() {
    if (state.viewMode === "read") return renderReadView();
    if (state.viewMode === "create") return renderCreateView();
    return `${renderNavbar()}${renderHomeView()}`;
  }

  function renderNavbar() {
    const authSection = state.isLoggedIn
      ? `<div class="flex items-center gap-3">
          <div class="hidden md:flex flex-col items-end">
            <span class="text-xs text-muted-foreground">Signed in as</span>
            <span class="text-sm font-medium text-foreground max-w-[150px] truncate">${h(state.userEmail || "User")}</span>
          </div>
          <div class="h-8 w-px bg-border hidden md:block"></div>
          <button data-action="profile-open" class="flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="Edit display name">${icon("user", "w-4 h-4")}</button>
          <button data-action="logout" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Sign Out">
            ${icon("logOut", "w-4 h-4")}
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>`
      : `<button data-action="sign-in" class="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md">
          ${icon("user", "w-4 h-4")}
          <span>Sign In</span>
        </button>`;

    return `<nav class="fixed top-0 left-0 right-0 z-50 h-16 px-4 backdrop-blur-md border-b border-blue-100 flex items-center justify-between transition-all bg-background/80">
      <div class="flex items-center gap-4">
        <button data-action="home" class="flex items-center gap-3 group focus:outline-none" aria-label="Go to Home">
          <img src="/static/images/logo.png" alt="TaleTinker Logo" class="h-10 object-contain transition-transform group-hover:scale-105">
        </button>
      </div>
      <div class="flex items-center gap-4">
        <a href="https://featurerequest.io/onurmatik/tale-tinker/" target="_blank" rel="noopener noreferrer" aria-label="Suggest a Feature or Report a Bug" title="Suggest a Feature or Report a Bug" class="group relative flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
          ${icon("lifeBuoy", "w-4 h-4")}
          <span class="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 dark:bg-slate-800 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-visible:opacity-100 group-focus-visible:visible transition-all">Suggest a Feature or Report a Bug</span>
        </a>
        ${authSection}
      </div>
    </nav>`;
  }

  function renderHomeView() {
    const promptCards = state.starterPrompts.map((prompt, index) => `
      <button data-action="start-prompt" data-prompt="${h(prompt)}" class="tt-fade-up group relative p-5 rounded-xl border border-border bg-card/50 hover:bg-card text-left hover:border-primary/30 transition-all hover:shadow-lg hover:-translate-y-1" style="animation-delay: ${0.12 + index * 0.08}s">
        <div class="absolute top-4 right-4 text-primary/20 group-hover:text-primary transition-colors">${icon("sparkles", "w-5 h-5")}</div>
        <p class="text-foreground/90 font-medium leading-relaxed pr-6">&quot;${h(prompt)}&quot;</p>
        <div class="mt-4 flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
          Begin Story ${icon("arrowRight", "w-3 h-3 ml-1")}
        </div>
      </button>
    `).join("");

    const storyCards = state.stories.length
      ? state.stories.map((story) => `
        <button data-action="select-story" data-story-id="${h(story.uuid)}" class="group flex items-start gap-5 p-5 rounded-2xl border border-border bg-card hover:bg-accent/5 hover:border-accent/20 transition-all text-left shadow-sm hover:shadow-md">
          <div class="w-14 h-14 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">${icon("bookOpen", "w-6 h-6")}</div>
          <div class="flex-1 min-w-0">
            <h4 class="font-serif font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">${h(story.title || "Untitled Story")}</h4>
            <p class="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">${h(story.tagline || story.preview || "")}</p>
            <div class="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground/70 font-medium">
              <span class="bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">${h(dateLabel(story.created_at))}</span>
              <span>&bull;</span>
              <span>${h(story.length)} lines</span>
              <span>&bull;</span>
              <span class="inline-flex items-center gap-1.5">${icon("user", "w-3.5 h-3.5")}${h(story.author_name || "Anonymous")}</span>
              ${Number(story.like_count || 0) > 0 ? `<span>&bull;</span><span class="inline-flex items-center gap-1.5">${icon("heart", "w-3.5 h-3.5")}${h(story.like_count)}</span>` : ""}
            </div>
          </div>
          <div class="self-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">${icon("chevronRight", "w-5 h-5 text-primary")}</div>
        </button>
      `).join("")
      : `<div class="py-12 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/5">
          ${icon("bookOpen", "w-10 h-10 text-muted-foreground/20 mx-auto mb-3")}
          <p class="text-muted-foreground">No stories in your library yet.</p>
          <p class="text-sm text-muted-foreground/50 mt-1">Start writing above!</p>
        </div>`;

    return `<div class="min-h-screen bg-background text-foreground font-sans pt-16">
      <section class="relative px-6 py-12 md:py-20 max-w-4xl mx-auto flex flex-col items-center text-center">
        <div class="mb-8 tt-fade-up">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide mb-4">${icon("sparkles", "w-3 h-3")}AI Story Creator</span>
          <h1 class="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">What story will you <span class="text-primary italic">weave</span> today?</h1>
          <p class="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Begin with a single sentence, and let TaleTinker guide you through an endless journey of imagination.</p>
        </div>

        <form data-form="home-start" class="w-full max-w-2xl relative group tt-scale-in">
          <div class="relative bg-card border border-border rounded-2xl shadow-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <textarea id="home-prompt" placeholder="Once upon a time, in a land far away..." class="w-full p-6 text-lg md:text-xl bg-transparent border-none outline-none resize-none min-h-[120px] placeholder:text-muted-foreground/50">${h(state.homePrompt || "")}</textarea>
            <div class="flex items-center justify-between px-4 pb-4 bg-muted/30 border-t border-border/50 pt-3">
              <span id="home-prompt-count" class="text-xs text-muted-foreground font-medium pl-2">${state.homePrompt ? `${state.homePrompt.length} chars` : "Type your opening..."}</span>
              <button id="home-start-button" type="submit" ${state.homePrompt ? "" : "disabled"} class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${state.homePrompt ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5" : "bg-muted text-muted-foreground cursor-not-allowed"}">
                ${icon("penTool", "w-4 h-4")}
                Weave Tale
              </button>
            </div>
          </div>
        </form>

        <div class="mt-12 w-full max-w-3xl">
          <div class="flex items-center justify-center gap-4 mb-6">
            <div class="h-px bg-border w-12"></div>
            <span class="text-sm text-muted-foreground font-medium uppercase tracking-wider">Or start with a spark</span>
            <div class="h-px bg-border w-12"></div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            ${promptCards}
            <button data-action="start-empty" class="md:col-span-2 p-3 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 tt-fade-up" style="animation-delay: 0.32s">
              <span class="border-b border-dashed border-muted-foreground/50 hover:border-primary">I'm feeling lucky, show me more options</span>
            </button>
          </div>
        </div>
      </section>

      <main class="px-6 max-w-3xl mx-auto pb-20 border-t border-border pt-12">
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-foreground flex items-center gap-2">${icon("clock", "w-5 h-5 text-muted-foreground")}Recent Journeys</h3>
          </div>
          <div class="grid gap-4">${storyCards}</div>
        </div>
      </main>
    </div>`;
  }

  function renderReadView() {
    const treePanel = state.showTreeView
      ? `<div class="flex-shrink-0 border-r border-border h-full z-20 shadow-xl bg-background overflow-hidden relative tt-fade-in" style="width: 280px">
          <div class="absolute inset-0 w-[280px]">${renderStoryTreeView()}</div>
        </div>`
      : "";

    const content = state.activeStory
      ? renderStoryDetailView(state.activeStory)
      : `<div class="p-8 text-center text-muted-foreground">Loading story...</div>`;

    return `<div class="flex h-screen overflow-hidden bg-background">
      ${treePanel}
      <div class="flex-1 flex flex-col h-full overflow-hidden relative">
        <div class="h-full overflow-y-auto">${content}</div>
      </div>
    </div>`;
  }

  function renderStoryDetailView(story) {
    const path = (story.lines || []).map((line, index, lines) => ({
      id: line.id,
      text: line.text,
      parentId: index > 0 ? lines[index - 1].id : null,
      childrenIds: [],
      alternatives: line.alternatives || [],
      likes: line.like_count,
      isLiked: line.is_liked,
    }));

    const storyLines = path.map((node) => node.text);
    const shareLabel = state.shareStatus === "copied" ? "Link Copied" : state.shareStatus === "error" ? "Copy Failed" : "Share";

    return `<div class="min-h-screen bg-background text-foreground font-sans">
      <div class="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 md:px-8">
        <div class="flex items-center gap-4">
          <button data-action="back" class="p-2 -ml-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            ${icon("arrowLeft", "w-5 h-5")}
            <span class="text-sm font-medium hidden md:inline-block">Back to Library</span>
          </button>
        </div>
      </div>

      <main class="container max-w-3xl mx-auto px-4 pt-8 pb-32">
        <div class="mb-12 text-center space-y-6">
          <h1 class="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">${h(story.title || "Untitled Story")}</h1>
          ${story.tagline ? `<p class="text-base md:text-lg font-serif italic text-muted-foreground">${h(story.tagline)}</p>` : ""}
          <div class="flex flex-col items-center gap-4">
            <div class="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div class="flex items-center gap-2">${icon("calendar", "w-4 h-4")}<span>${new Date().toLocaleDateString()}</span></div>
              <div class="flex items-center gap-2">${icon("user", "w-4 h-4")}<span>${h(story.author_name || "Unknown Author")}</span></div>
            </div>
            <div class="flex items-center gap-3 flex-wrap justify-center">
              <button data-action="like-story" class="flex items-center gap-2 px-4 py-2 rounded-full transition-colors group ${story.is_liked ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"}">
                ${icon("heart", `w-4 h-4 transition-colors ${story.is_liked ? "fill-current" : "group-hover:fill-current group-hover:text-red-500"}`)}
                <span class="text-sm font-medium">${story.is_liked ? "Liked" : "Like"}</span>
              </button>
              <button data-action="share" class="flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${state.shareStatus === "copied" ? "bg-primary/10 text-primary" : state.shareStatus === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"}">
                ${icon("share", "w-4 h-4")}
                <span class="text-sm font-medium">${shareLabel}</span>
              </button>
              <button data-action="toggle-tree" class="flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 group ${state.showTreeView ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}">
                ${icon("gitGraph", "w-4 h-4")}
                <span class="text-sm font-medium">${state.showTreeView ? "Hide Map" : "View Map"}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-8 relative">
          <div class="absolute left-0 top-4 bottom-4 w-px bg-border md:left-8"></div>
          ${path.map((node, index) => renderStoryLine(node, index, storyLines)).join("")}
          <div class="relative pl-6 md:pl-16 pt-8">
            <div class="absolute left-[-5px] md:left-[27px] top-10 w-3 h-3 rounded-full border-2 border-primary bg-background"></div>
            <p class="text-center font-serif italic text-muted-foreground">~ The End ~</p>
          </div>
        </div>
      </main>
    </div>`;
  }

  function renderStoryLine(node, index, storyLines) {
    const alternatives = node.alternatives || [];
    const hasAlternatives = alternatives.length > 0;
    const likeCount = node.likes || 0;
    const isOpen = state.openAlternativeLineId === node.id;

    const indicator = (likeCount > 0 || hasAlternatives)
      ? `<div data-action="${hasAlternatives ? "toggle-alternatives" : ""}" data-line-id="${h(node.id)}" class="absolute top-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground/70 select-none bg-background/80 backdrop-blur-[2px] rounded-full px-1.5 py-0.5 border border-border/20 shadow-sm transition-colors left-6 -translate-x-0 md:left-[22px] md:-translate-x-full ${hasAlternatives ? "cursor-pointer hover:bg-muted/80 hover:text-foreground" : ""}">
          ${likeCount > 0 ? `<div class="flex items-center gap-0.5">${icon("heart", "w-2.5 h-2.5 fill-current text-muted-foreground")}<span>${likeCount}</span></div>` : ""}
          ${hasAlternatives ? `<div class="flex items-center gap-0.5">${icon("gitFork", "w-2.5 h-2.5")}<span>${alternatives.length}</span></div>` : ""}
          ${isOpen && hasAlternatives ? `<div class="absolute left-0 top-full mt-2 w-72 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden origin-top-left md:origin-top-right md:left-auto md:right-0 md:mr-0">
            <div class="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
              <span class="text-xs font-medium text-muted-foreground">Alternative paths</span>
              <button data-action="close-alternatives" class="text-muted-foreground hover:text-foreground">${icon("x", "w-3 h-3")}</button>
            </div>
            <div class="p-2 space-y-1 max-h-[300px] overflow-y-auto">
              ${alternatives.map((altText, altIndex) => `
                <button data-action="choose-alt" data-line-index="${index}" data-alt-index="${altIndex}" class="block w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm group/item">
                  <span class="line-clamp-3 text-muted-foreground group-hover/item:text-foreground">&quot;${h(altText)}&quot;</span>
                  <span class="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-primary opacity-0 group-hover/item:opacity-100 transition-opacity">${icon("cornerDownRight", "w-3 h-3")}Switch to this path</span>
                </button>`).join("")}
            </div>
          </div>` : ""}
        </div>`
      : "";

    return `<div class="relative pl-6 md:pl-16 group pb-2 tt-fade-up" style="animation-delay: ${index * 0.04}s">
      <div class="absolute left-[-3px] md:left-[29px] top-2 w-2 h-2 rounded-full bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary transition-colors z-10"></div>
      ${indicator}
      <div class="relative">
        <div class="relative inline-block text-lg md:text-xl leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">${h(node.text)}</div>
        <div class="absolute left-0 top-full mt-1 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 origin-top-left">
          <button data-action="like-line" data-line-id="${h(node.id)}" class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${node.isLiked ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400" : "bg-background hover:bg-muted text-muted-foreground border-border/50"}">
            ${icon("heart", `w-3 h-3 ${node.isLiked ? "fill-current" : ""}`)}
            <span>${node.isLiked ? "Liked" : "Like"}</span>
          </button>
          <button data-action="fork-line" data-line-index="${index}" class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors border bg-background hover:bg-muted text-muted-foreground border-border/50">
            ${icon("gitFork", "w-3 h-3")}
            <span>Fork</span>
          </button>
        </div>
      </div>
      <script type="application/json" data-story-lines="${index}">${h(JSON.stringify(storyLines))}</script>
    </div>`;
  }

  function renderStoryTreeView() {
    const graph = buildStoryGraph();
    if (!graph.relevantStories.length) return "";

    const xGap = 40;
    const yGap = 60;
    const startX = 40;
    const startY = 40;

    const paths = graph.edges.map((edge, index) => {
      const x1 = startX + edge.from.x * xGap;
      const y1 = startY + edge.from.depth * yGap;
      const x2 = startX + edge.to.x * xGap;
      const y2 = startY + edge.to.depth * yGap;
      const isCurrentPath = edge.to.storyIds.includes(state.selectedStoryId) && edge.from.storyIds.includes(state.selectedStoryId);
      const d = x1 === x2
        ? `M ${x1} ${y1} L ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${y1 + yGap / 2}, ${x2} ${y2 - yGap / 2}, ${x2} ${y2}`;
      return `<path key="edge-${index}" d="${d}" fill="none" stroke="${isCurrentPath ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}" stroke-width="${isCurrentPath ? 3 : 2}" stroke-opacity="${isCurrentPath ? 1 : 0.3}" stroke-linecap="round"></path>`;
    }).join("");

    const nodes = graph.nodes.map((node) => {
      const cx = startX + node.x * xGap;
      const cy = startY + node.depth * yGap;
      const isSelected = node.storyIds.includes(state.selectedStoryId);
      return `<g data-action="tree-select" data-story-id="${h(node.storyIds[0] || "")}" class="cursor-pointer group">
        <circle cx="${cx}" cy="${cy}" r="15" fill="transparent"></circle>
        <circle cx="${cx}" cy="${cy}" r="${isSelected ? 6 : 4}" fill="hsl(var(--background))" stroke="${isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}" stroke-width="${isSelected ? 3 : 2}" class="transition-all duration-300"></circle>
        <circle cx="${cx}" cy="${cy}" r="10" stroke="hsl(var(--primary))" stroke-width="2" stroke-opacity="0" fill="none" class="group-hover:stroke-opacity-30 transition-all duration-300"></circle>
      </g>`;
    }).join("");

    const labels = graph.nodes.filter((node) => node.label).map((node) => {
      const left = startX + node.x * xGap + 16;
      const top = startY + node.depth * yGap - 10;
      const isSelected = node.storyIds.includes(state.selectedStoryId);
      return `<div data-action="tree-select" data-story-id="${h(node.storyIds[0] || "")}" class="absolute text-xs px-2 py-1 rounded-md border backdrop-blur-sm whitespace-nowrap cursor-pointer transition-all max-w-[150px] truncate ${isSelected ? "bg-primary/10 border-primary/30 text-primary font-medium z-10" : "bg-background/80 border-border text-muted-foreground hover:bg-background hover:text-foreground z-0"}" style="left: ${left}px; top: ${top}px">${h(node.label)}</div>`;
    }).join("");

    return `<div class="flex flex-col h-full bg-background border-r border-border">
      <div class="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <h3 class="font-bold text-sm uppercase tracking-wider text-muted-foreground">Story Map</h3>
        <button data-action="tree-close" class="p-1 hover:bg-muted rounded-full">${icon("x", "w-4 h-4")}</button>
      </div>
      <div class="flex-1 overflow-auto relative custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        <div style="width: ${graph.width}px; height: ${graph.height}px; min-width: 100%" class="relative">
          <svg width="100%" height="100%" style="min-width: ${graph.width}px; min-height: ${graph.height}px" class="block">${paths}${nodes}</svg>
          ${labels}
        </div>
      </div>
    </div>`;
  }

  function buildStoryGraph() {
    const stories = [
      ...state.stories.map((story) => ({
        id: story.uuid,
        rootId: story.root_node_id || story.uuid,
        title: story.title || "Untitled Story",
        date: dateLabel(story.created_at),
        lines: (story.lines || []).map((line) => line.text),
      })),
      ...state.runtimeStories,
    ];
    const current = stories.find((story) => story.id === state.selectedStoryId);
    if (!current) return { relevantStories: [], nodes: [], edges: [], width: 0, height: 0 };
    const rootId = current.rootId || current.id;
    const relevantStories = stories.filter((story) => (story.rootId || story.id) === rootId);
    if (!relevantStories.length) return { relevantStories, nodes: [], edges: [], width: 0, height: 0 };

    const rawRootId = "root_node";
    const rawNodes = new Map();
    rawNodes.set(rawRootId, { id: rawRootId, text: "Start", children: new Set(), storyIds: new Set(), depth: 0 });

    relevantStories.forEach((story) => {
      let parentId = rawRootId;
      story.lines.forEach((line, index) => {
        const parent = rawNodes.get(parentId);
        parent.storyIds.add(story.id);
        let existingChildId = null;
        for (const childId of parent.children) {
          if (rawNodes.get(childId)?.text === line) {
            existingChildId = childId;
            break;
          }
        }
        if (existingChildId) {
          parentId = existingChildId;
          rawNodes.get(parentId).storyIds.add(story.id);
        } else {
          const newId = `node_${rawNodes.size}`;
          rawNodes.set(newId, { id: newId, text: line, children: new Set(), storyIds: new Set([story.id]), depth: index + 1 });
          parent.children.add(newId);
          parentId = newId;
        }
      });
    });

    const nodeXMap = new Map();
    let globalMaxX = 0;
    const getRaw = (id) => rawNodes.get(id);
    const assignX = (nodeId, x) => {
      nodeXMap.set(nodeId, x);
      globalMaxX = Math.max(globalMaxX, x);
      const children = Array.from(getRaw(nodeId).children);
      if (!children.length) return;
      assignX(children[0], x);
      for (let i = 1; i < children.length; i += 1) {
        assignX(children[i], globalMaxX + 1);
      }
    };
    assignX(rawRootId, 0);

    const displayNodes = [];
    const displayEdges = [];
    const isImportant = (id) => {
      const node = getRaw(id);
      if (id === rawRootId) return true;
      return node.children.size !== 1;
    };

    const buildDisplayTree = (rawId, currentDisplayParent, currentY) => {
      const rawNode = getRaw(rawId);
      const important = isImportant(rawId);
      let nextParent = currentDisplayParent;
      let nextY = currentY;
      if (important) {
        const displayNode = {
          id: rawId,
          depth: currentY,
          x: nodeXMap.get(rawId) || 0,
          children: [],
          storyIds: Array.from(rawNode.storyIds),
          isLeaf: rawNode.children.size === 0,
          isBranching: rawNode.children.size > 1,
          isRoot: rawId === rawRootId,
          isCurrent: rawNode.storyIds.has(state.selectedStoryId),
          label: rawNode.children.size === 0
            ? relevantStories.find((story) => story.lines[story.lines.length - 1] === rawNode.text && rawNode.storyIds.has(story.id))?.title
            : undefined,
        };
        displayNodes.push(displayNode);
        if (currentDisplayParent) {
          currentDisplayParent.children.push(displayNode);
          displayEdges.push({ from: currentDisplayParent, to: displayNode });
        }
        nextParent = displayNode;
        nextY = currentY + 1;
      }
      Array.from(rawNode.children).forEach((childId) => buildDisplayTree(childId, nextParent, nextY));
    };
    buildDisplayTree(rawRootId, null, 0);

    const maxX = Math.max(0, ...displayNodes.map((node) => node.x));
    const maxY = Math.max(0, ...displayNodes.map((node) => node.depth));
    return {
      relevantStories,
      nodes: displayNodes,
      edges: displayEdges,
      width: Math.max(300, maxX * 50 + 240),
      height: Math.max(400, maxY * 80 + 60),
    };
  }

  function renderCreateView() {
    const path = currentPath();
    const storyNodes = path.map((node, index) => renderCreateStoryNode(node, index, index === path.length - 1 && !state.isEnded)).join("");
    const inputArea = !state.isEnded
      ? `<div class="sticky bottom-6 z-40">
          ${!state.isLoggedIn && path.length >= state.anonSigninLine ? renderSignInGate() : renderChoicePanel()}
        </div>`
      : "";

    return `${renderNavbar()}
      <main class="container max-w-3xl mx-auto px-4 pt-24 pb-32 min-h-screen flex flex-col">
        <div class="flex-1">
          ${storyNodes}
          ${state.isEnded ? renderStoryEnding() : ""}
          <div id="story-bottom" class="h-4"></div>
        </div>
        ${inputArea}
      </main>`;
  }

  function renderCreateStoryNode(node, index, isLast) {
    return `<div class="group relative mb-6 md:mb-8 tt-fade-up" style="animation-delay: ${index * 0.08}s">
      <div class="relative z-10">
        <p class="font-serif leading-relaxed text-foreground transition-colors duration-300 ${isLast ? "text-xl md:text-2xl font-medium" : "text-lg md:text-xl text-foreground/80"}">${h(node.text)}</p>
        ${!isLast ? `<button data-action="branch-node" data-node-id="${h(node.id)}" class="absolute -left-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-primary" title="Fork story from here">${icon("gitGraph", "w-4 h-4")}</button>` : ""}
      </div>
    </div>`;
  }

  function renderSignInGate() {
    return `<div class="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-6 text-center">
      <div class="text-sm uppercase tracking-widest text-muted-foreground">Save Your Story</div>
      <h3 class="mt-3 text-xl font-serif font-bold text-foreground">Sign in to keep writing</h3>
      <p class="mt-2 text-sm text-muted-foreground">You're making great progress. Sign in so we can save your story. It's free.</p>
      <button data-action="sign-in" class="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md">Sign In to Save</button>
    </div>`;
  }

  function renderChoicePanel() {
    const progressPercentage = (timeLeft / CHOICE_TIMEOUT_SECONDS) * 100;
    const isUrgent = progressPercentage < 30;
    const status = state.lineCheckMessage
      ? `<div class="text-xs font-medium ${state.lineCheckTone === "error" ? "text-destructive" : "text-muted-foreground"}">${h(state.lineCheckMessage)}</div>`
      : "";
    const timerLabel = state.isLoadingSuggestions
      ? `${icon("refresh", "w-3.5 h-3.5 animate-spin")}LOADING`
      : isTimerPaused
        ? `${icon("pauseCircle", "w-3.5 h-3.5")}PAUSED`
        : `${icon("clock", "w-3.5 h-3.5")}<span id="choice-timer-label">${Math.ceil(timeLeft)}s</span>`;

    const suggestionButtons = state.isLoadingSuggestions
      ? Array.from({ length: 2 }).map((_, index) => `
        <div class="p-4 rounded-lg border border-border bg-background flex items-start gap-3 animate-pulse" key="${index}">
          <div class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-muted-foreground/30"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3 rounded bg-muted/50 w-4/5"></div>
            <div class="h-3 rounded bg-muted/40 w-2/3"></div>
          </div>
        </div>
      `).join("")
      : state.suggestions.map((text, index) => {
        if (text === "The End") {
          return `<button data-action="select-suggestion" data-text="${h(text)}" ${state.isCheckingLine ? "disabled" : ""} class="group text-left p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3">
            ${icon("sparkles", "w-4 h-4 text-primary")}
            <span class="text-primary font-medium font-serif italic">The End.</span>
            ${icon("sparkles", "w-4 h-4 text-primary")}
          </button>`;
        }
        return `<button data-action="select-suggestion" data-text="${h(text)}" ${state.isCheckingLine ? "disabled" : ""} class="group text-left p-4 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all duration-200 flex items-start gap-3">
          <div class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-muted-foreground/30 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-[10px] text-muted-foreground transition-colors">${String.fromCharCode(65 + index)}</div>
          <span class="text-foreground/90 font-serif leading-relaxed group-hover:text-primary transition-colors">${h(text)}</span>
        </button>`;
      }).join("");

    return `<div class="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden mt-8" id="choice-panel">
      <div class="h-1.5 w-full bg-secondary">
        <div id="choice-progress" class="h-full origin-left ${isUrgent ? "bg-destructive" : "bg-primary"} ${isTimerPaused ? "opacity-50" : ""}" style="width: ${progressPercentage}%"></div>
      </div>
      <div class="p-4 md:p-6 space-y-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">${icon("sparkles", "w-4 h-4 text-primary")}What happens next?</h3>
          <div class="flex items-center gap-1.5 text-xs font-mono font-medium transition-colors ${isTimerPaused ? "text-primary" : isUrgent ? "text-destructive" : "text-muted-foreground"}" id="choice-timer">
            <button data-action="refresh-suggestions" class="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors mr-2" title="Refresh options" ${state.isCheckingLine || state.isLoadingSuggestions ? "disabled" : ""}>${icon("refresh", "w-3.5 h-3.5")}</button>
            ${timerLabel}
          </div>
        </div>
        ${status}
        <div class="grid gap-3">
          ${suggestionButtons}
          <form data-form="choice-custom" class="relative">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">${icon("penTool", "w-4 h-4")}</div>
            <input id="choice-custom-input" type="text" placeholder="Write your own continuation or type 'The End' to end the story" class="w-full pl-10 pr-12 py-3.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif ${isTimerPaused ? "border-primary ring-2 ring-primary/10" : "border-border"}" ${state.isCheckingLine ? "disabled" : ""}>
            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors" disabled>${icon("send", "w-4 h-4")}</button>
          </form>
        </div>
      </div>
    </div>`;
  }

  function renderStoryEnding() {
    const canSave = Boolean(state.savedStoryId) && !state.isLoadingStoryMeta && !state.isSavingStory;
    const body = state.isLoadingStoryMeta
      ? `<div class="space-y-4 animate-pulse">
          <div class="h-10 md:h-12 rounded-lg bg-muted/40 w-64 mx-auto"></div>
          <div class="h-4 rounded bg-muted/30 w-72 mx-auto"></div>
        </div>`
      : `<div class="w-full max-w-2xl mx-auto text-left space-y-2">
          <div class="text-xs uppercase tracking-widest text-muted-foreground">Title</div>
          <div class="relative">
            <textarea id="ending-title" class="w-full min-h-[84px] resize-none rounded-2xl border border-primary/30 bg-card/60 px-5 py-4 text-2xl md:text-5xl font-serif font-bold text-foreground text-center placeholder:text-muted-foreground/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Untitled Story">${h(state.storyTitle)}</textarea>
            ${icon("pencil", "w-4 h-4 text-muted-foreground absolute right-4 top-4")}
          </div>
        </div>
        <div class="w-full max-w-2xl mx-auto text-left space-y-2">
          <div class="text-xs uppercase tracking-widest text-muted-foreground">Tagline</div>
          <div class="relative">
            <textarea id="ending-tagline" class="w-full min-h-[56px] resize-none rounded-2xl border border-primary/20 bg-card/40 px-5 py-3 text-base md:text-lg font-serif italic text-foreground text-center placeholder:text-muted-foreground/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60" placeholder="Add a short tagline">${h(state.storyTagline)}</textarea>
            ${icon("pencil", "w-3.5 h-3.5 text-muted-foreground absolute right-4 top-4")}
          </div>
        </div>`;

    return `<div class="text-center py-12 px-4 max-w-2xl mx-auto space-y-12 tt-scale-in">
      <div class="flex justify-center">
        <div class="p-4 rounded-full bg-primary/10 text-primary relative group">${icon("bookOpen", "w-8 h-8")}</div>
      </div>
      <div class="space-y-6">
        <div class="uppercase tracking-widest text-xs font-semibold text-muted-foreground">The End</div>
        ${body}
      </div>
      <div class="grid gap-6 mt-12">
        <div class="flex justify-center">
          <button data-action="save-view" ${canSave ? "" : "disabled"} class="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all shadow-md ${canSave ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg" : "bg-muted text-muted-foreground cursor-not-allowed"}">
            ${icon("arrowRight", "w-4 h-4")}
            ${state.isSavingStory ? "Saving..." : "Save and View Story"}
          </button>
        </div>
        <div class="flex justify-center pt-4">
          <button data-action="restart" class="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-muted-foreground hover:text-foreground font-medium text-sm hover:bg-secondary/50 transition-colors">
            ${icon("rotateCcw", "w-4 h-4 group-hover:-rotate-180 transition-transform duration-500")}
            Start New Story
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderAuthModal() {
    if (!state.showAuthModal) return "";
    const content = state.authStatus === "success"
      ? `<div class="bg-background w-full max-w-[440px] rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden mx-auto tt-scale-in">
          <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-10 -mt-10"></div>
          <div class="relative z-10 flex flex-col items-center text-center space-y-6 py-8">
            <div class="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">${icon("checkCircle", "w-8 h-8")}</div>
            <h2 class="text-3xl font-bold tracking-tight">Check your inbox</h2>
            <p class="text-muted-foreground text-lg">We've sent a magic login link to <br><span class="font-semibold text-foreground">${h(state.authEmail)}</span></p>
            <p class="text-sm text-muted-foreground">Didn't receive it? <button data-action="auth-retry" class="text-primary hover:underline font-medium">Try again</button></p>
          </div>
        </div>`
      : `<div class="bg-background w-full max-w-[440px] rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden mx-auto">
          <div class="absolute top-0 right-0 w-32 h-32 bg-secondary/30 rounded-bl-full pointer-events-none"></div>
          <div class="relative z-10">
            <h2 class="text-4xl font-bold tracking-tight text-foreground mb-3 font-sans">Sign in to TaleTinker</h2>
            <p class="text-muted-foreground text-lg leading-relaxed mb-10">${state.isLoggedIn ? "You are already signed in." : "Enter your email to continue."}</p>
            <form data-form="auth" class="space-y-6">
              <div class="space-y-2">
                <label for="email" class="text-xs font-bold text-muted-foreground tracking-wider uppercase pl-1">Email</label>
                <div class="relative group">
                  <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors">${icon("mail", "w-5 h-5")}</div>
                  <input id="email" type="email" value="${h(state.authEmail)}" placeholder="name@example.com" class="w-full bg-secondary/20 hover:bg-secondary/30 focus:bg-background transition-colors border ${state.authError ? "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/5" : "border-border/50 focus:border-primary/50"} rounded-xl py-4 pl-12 pr-4 outline-none text-lg text-foreground placeholder:text-muted-foreground/40 focus:ring-4 focus:ring-primary/5" autocomplete="email" autofocus>
                </div>
                ${state.authError ? `<p class="text-sm text-destructive pl-1">${h(state.authError)}</p>` : ""}
              </div>
              <button type="submit" ${state.authStatus === "loading" ? "disabled" : ""} class="w-full bg-foreground text-background font-medium text-lg rounded-xl py-4 px-6 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed">
                ${state.authStatus === "loading" ? icon("loader", "w-6 h-6 animate-spin") : `Continue with Email ${icon("arrowRight", "w-5 h-5")}`}
              </button>
            </form>
            <div class="mt-10 text-center">
              <p class="text-sm text-muted-foreground/60 leading-relaxed px-4">By clicking continue, you agree to our <a href="#" class="hover:text-foreground transition-colors underline decoration-muted-foreground/30">Terms of Service</a> and <a href="#" class="hover:text-foreground transition-colors underline decoration-muted-foreground/30">Privacy Policy</a>.</p>
            </div>
          </div>
        </div>`;

    return `<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm tt-fade-in">
      <div class="relative w-full max-w-md">
        <button data-action="auth-close" class="absolute -top-12 right-0 p-2 text-foreground/50 hover:text-foreground transition-colors">${icon("x", "w-6 h-6")}</button>
        ${content}
      </div>
    </div>`;
  }

  function renderProfileModal() {
    if (!state.showProfileModal) return "";
    return `<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm tt-fade-in">
      <div class="relative w-full max-w-md">
        <button data-action="profile-close" class="absolute -top-12 right-0 p-2 text-foreground/50 hover:text-foreground transition-colors">${icon("x", "w-6 h-6")}</button>
        <div class="bg-background w-full rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden tt-scale-in">
          <div class="absolute top-0 right-0 w-36 h-36 bg-secondary/30 rounded-bl-full pointer-events-none"></div>
          <div class="relative z-10">
            <div class="flex items-start gap-4">
              <div class="p-3 rounded-2xl bg-primary/10 text-primary">${icon("user", "w-6 h-6")}</div>
              <div>
                <h2 class="text-2xl font-bold tracking-tight text-foreground">Choose your display name</h2>
                <p class="text-sm text-muted-foreground mt-1">This will appear as the author name on your stories.</p>
              </div>
            </div>
            <form data-form="profile" class="mt-8 space-y-5">
              <div class="space-y-2">
                <label for="display-name" class="text-xs font-bold text-muted-foreground tracking-wider uppercase pl-1">Display Name</label>
                <input id="display-name" type="text" value="${h(state.displayNameDraft)}" class="w-full bg-secondary/20 hover:bg-secondary/30 focus:bg-background transition-colors border border-border/50 focus:border-primary/50 rounded-xl py-3.5 px-4 outline-none text-lg text-foreground placeholder:text-muted-foreground/40 focus:ring-4 focus:ring-primary/5" placeholder="Storyteller" autocomplete="name" autofocus maxlength="150">
                ${state.displayNameError ? `<p class="text-sm text-destructive pl-1">${h(state.displayNameError)}</p>` : ""}
              </div>
              <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" data-action="profile-close" class="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">Cancel</button>
                <button type="submit" ${state.isUpdatingDisplayName ? "disabled" : ""} class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                  ${state.isUpdatingDisplayName ? `${icon("loader", "w-4 h-4 animate-spin")}Saving...` : "Save Display Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>`;
  }

  function afterRender() {
    const active = document.activeElement;
    autosize(document.getElementById("ending-title"));
    autosize(document.getElementById("ending-tagline"));
    setupChoiceTimer();
    if (shouldScrollBottom) {
      shouldScrollBottom = false;
      window.setTimeout(() => document.getElementById("story-bottom")?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    if (state.showAuthModal && state.authStatus !== "success" && !active?.id) {
      document.getElementById("email")?.focus();
    }
    if (state.showProfileModal && !active?.id) {
      document.getElementById("display-name")?.focus();
    }
  }

  function autosize(element) {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function setupChoiceTimer() {
    const panel = document.getElementById("choice-panel");
    const path = currentPath();
    const signInGateVisible = !state.isLoggedIn && path.length >= state.anonSigninLine;
    if (!panel || state.isEnded || signInGateVisible || state.isLoadingSuggestions || state.isCheckingLine) {
      clearChoiceTimer();
      return;
    }
    const key = state.suggestions.join("||");
    if (key !== choiceTimerKey) {
      clearChoiceTimer();
      choiceTimerKey = key;
      timeLeft = CHOICE_TIMEOUT_SECONDS;
      isTimerPaused = false;
    }
    if (!choiceTimerId) {
      choiceTimerId = window.setInterval(() => {
        if (isTimerPaused || state.isLoadingSuggestions || state.isCheckingLine) return;
        timeLeft = Math.max(0, timeLeft - 0.1);
        updateTimerDom();
        if (timeLeft <= 0 && state.suggestions.length > 0) {
          clearChoiceTimer();
          void handleSelectNext(state.suggestions[0]);
        }
      }, 100);
    }
    updateTimerDom();
  }

  function clearChoiceTimer() {
    if (choiceTimerId) {
      window.clearInterval(choiceTimerId);
      choiceTimerId = null;
    }
  }

  function updateTimerDom() {
    const progress = document.getElementById("choice-progress");
    const label = document.getElementById("choice-timer-label");
    const timer = document.getElementById("choice-timer");
    if (!progress || !label || !timer) return;
    const percentage = (timeLeft / CHOICE_TIMEOUT_SECONDS) * 100;
    progress.style.width = `${percentage}%`;
    progress.classList.toggle("bg-destructive", percentage < 30);
    progress.classList.toggle("bg-primary", percentage >= 30);
    progress.classList.toggle("opacity-50", isTimerPaused);
    label.textContent = `${Math.ceil(timeLeft)}s`;
    timer.classList.toggle("text-primary", isTimerPaused);
    timer.classList.toggle("text-destructive", !isTimerPaused && percentage < 30);
    timer.classList.toggle("text-muted-foreground", !isTimerPaused && percentage >= 30);
  }

  async function loadStories() {
    try {
      state.stories = await api.listStories();
      render();
    } catch (error) {
      console.error("Failed to load stories", error);
    }
  }

  async function loadConfig() {
    try {
      const config = await api.getStoryConfig();
      state.minStoryLines = config.min_story_lines;
      state.anonSigninLine = config.anon_signin_line;
      render();
    } catch (error) {
      console.error("Failed to load story config", error);
    }
  }

  async function loadMe() {
    try {
      const user = await api.getMe();
      state.isLoggedIn = user.is_authenticated;
      state.userEmail = user.email;
      state.displayName = user.display_name;
      if (!state.isLoggedIn) state.showProfileModal = false;
      render();
      maybeResumeDraft();
    } catch (error) {
      console.error("Failed to load user", error);
    }
  }

  function maybeResumeDraft() {
    if (!state.isLoggedIn || hasResumedDraft) return;
    let shouldResume = false;
    try {
      shouldResume = window.localStorage.getItem(RESUME_STORAGE_KEY) === "true";
    } catch (error) {
      console.error("Failed to read resume flag", error);
    }
    if (!shouldResume) return;
    hasResumedDraft = true;

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.nodes || !draft.headId) return;
      state.nodes = draft.nodes;
      state.headId = draft.headId;
      state.storyTitle = draft.storyTitle || "";
      state.isEnded = false;
      state.suggestions = [];
      state.showTreeView = false;
      state.lineCheckMessage = null;
      state.lineCheckTone = null;
      state.isCheckingLine = false;
      state.viewMode = "create";
      const path = buildPathFromDraft(draft.nodes, draft.headId);
      void fetchSuggestions(path.map((node) => node.text), canEndStory(path.length));
    } catch (error) {
      console.error("Failed to restore draft", error);
    } finally {
      try {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear resume flag", error);
      }
    }
    render();
  }

  async function fetchSuggestions(context, includeEndOption) {
    const requestId = ++suggestionRequestId;
    state.isLoadingSuggestions = true;
    state.suggestions = [];
    render();
    try {
      const options = await api.suggestLines(context);
      if (suggestionRequestId !== requestId) return;
      const trimmedOptions = options
        .map((option) => option?.trim())
        .filter(Boolean)
        .filter((option) => option.toLowerCase() !== "the end");
      const limitedOptions = includeEndOption ? trimmedOptions.slice(0, 1) : trimmedOptions.slice(0, 2);
      state.suggestions = includeEndOption ? ["The End", ...limitedOptions] : limitedOptions;
    } catch (error) {
      if (suggestionRequestId !== requestId) return;
      console.error("Failed to fetch suggestions", error);
      state.suggestions = includeEndOption ? ["The End"] : [];
    } finally {
      if (suggestionRequestId === requestId) {
        state.isLoadingSuggestions = false;
        choiceTimerKey = "";
        render();
      }
    }
  }

  function startNewStory(initialText = "") {
    state.nodes = {};
    state.headId = null;
    state.isEnded = false;
    state.storyTitle = "";
    state.storyTagline = "";
    state.savedStoryId = null;
    state.isLoadingStoryMeta = false;
    state.isSavingStory = false;
    state.previousStoryId = state.selectedStoryId;
    state.suggestions = [];
    state.isCheckingLine = false;
    state.lineCheckMessage = null;
    state.lineCheckTone = null;
    state.viewMode = "create";
    state.showTreeView = false;
    state.openAlternativeLineId = null;
    shouldScrollBottom = true;
    if (initialText) {
      const id = generateId();
      state.nodes[id] = {
        id,
        text: initialText,
        parentId: null,
        childrenIds: [],
        createdAt: Date.now(),
        isCustom: true,
      };
      state.headId = id;
      void fetchSuggestions([initialText], false);
    } else {
      void fetchSuggestions([], false);
    }
    if (window.location.pathname !== "/") navigateTo("/", true);
    render();
  }

  async function handleSelectStory(id, options = {}) {
    try {
      let story = null;
      const runtime = state.runtimeStories.find((item) => item.id === id);
      if (runtime) {
        story = runtimeToStory(runtime);
      } else {
        story = await api.getStory(id);
      }
      state.activeStory = story;
      state.selectedStoryId = id;
      state.viewMode = "read";
      state.showTreeView = false;
      state.openAlternativeLineId = null;
      if (!options.skipHistory) {
        navigateTo(`/stories/${encodeURIComponent(id)}`, options.replace);
      }
      render();
    } catch (error) {
      console.error("Could not fetch story", error);
      goHome();
    }
  }

  function runtimeToStory(story) {
    return {
      id: story.id,
      uuid: story.id,
      title: story.title,
      tagline: null,
      preview: "",
      lines: story.lines.map((text, index) => ({
        id: `${story.id}-${index}`,
        text,
        is_manual: true,
        like_count: 0,
        is_liked: false,
        alternatives: story.alternatives?.[index] || [],
      })),
      created_at: new Date().toISOString(),
      length: story.lines.length,
      author_name: "Anonymous",
      like_count: 0,
      is_liked: false,
      root_node_id: story.rootId,
    };
  }

  async function handleLikeStory() {
    if (!state.activeStory) return;
    try {
      const result = await api.likeStory(state.activeStory.uuid);
      state.activeStory = { ...state.activeStory, is_liked: result.is_liked, like_count: result.like_count };
      state.stories = state.stories.map((story) => story.uuid === state.activeStory.uuid ? { ...story, is_liked: result.is_liked, like_count: result.like_count } : story);
      render();
    } catch (error) {
      if (error.status === 401) handlePromptSignIn();
      console.error(error);
    }
  }

  async function handleLikeLine(lineId) {
    try {
      const result = await api.likeLine(lineId);
      if (state.activeStory) {
        state.activeStory = {
          ...state.activeStory,
          lines: state.activeStory.lines.map((line) => line.id === lineId ? { ...line, is_liked: result.is_liked, like_count: result.like_count } : line),
        };
      }
      render();
    } catch (error) {
      if (error.status === 401) handlePromptSignIn();
      console.error(error);
    }
  }

  async function handleForkFromLine(textLineIndex, storyLines, alternativeText) {
    if (alternativeText) {
      const prefix = storyLines.slice(0, textLineIndex);
      const newLines = [...prefix, alternativeText];
      try {
        const options = await api.suggestLines(newLines);
        const filtered = options.map((option) => option?.trim()).filter(Boolean).filter((option) => option.toLowerCase() !== "the end");
        if (filtered.length > 0) newLines.push(filtered[Math.floor(Math.random() * filtered.length)]);
      } catch (error) {
        console.error("Failed to fetch suggestion", error);
      }
      const newStoryId = generateId();
      const originalStory = state.activeStory;
      const baseTitle = originalStory?.title || "Untitled Story";
      const rootId = originalStory?.root_node_id || originalStory?.uuid || newStoryId;
      const runtimeStory = {
        id: newStoryId,
        rootId,
        title: `${baseTitle} (Alt)`,
        date: new Date().toLocaleDateString(),
        lines: newLines,
        alternatives: {},
      };
      state.runtimeStories = [...state.runtimeStories, runtimeStory];
      state.previousStoryId = state.selectedStoryId;
      await handleSelectStory(newStoryId);
      return;
    }

    const newNodes = {};
    let previousId = null;
    let newHeadId = null;
    for (let index = 0; index <= textLineIndex; index += 1) {
      const id = generateId();
      const node = {
        id,
        text: storyLines[index],
        parentId: previousId,
        childrenIds: [],
        createdAt: Date.now() + index * 1000,
        isCustom: false,
      };
      newNodes[id] = node;
      if (previousId && newNodes[previousId]) {
        newNodes[previousId].childrenIds.push(id);
      }
      previousId = id;
      newHeadId = id;
    }

    state.nodes = newNodes;
    state.headId = newHeadId;
    state.isEnded = false;
    state.storyTitle = state.activeStory ? `${state.activeStory.title || "Untitled Story"} (Remix)` : "Forked Story";
    state.previousStoryId = state.selectedStoryId;
    state.viewMode = "create";
    state.showTreeView = false;
    shouldScrollBottom = true;
    const pathLength = textLineIndex + 1;
    void fetchSuggestions(storyLines.slice(0, pathLength), canEndStory(pathLength));
    render();
  }

  async function handleSelectNext(text) {
    clearChoiceTimer();
    state.lineCheckMessage = null;
    state.lineCheckTone = null;
    if (text.toLowerCase() === "the end") {
      const path = currentPath();
      if (!canEndStory(path.length)) {
        state.lineCheckMessage = `Write at least ${Math.max(state.minStoryLines - path.length, 0)} more line(s) to end the story.`;
        state.lineCheckTone = "error";
        render();
        return false;
      }
      state.isEnded = true;
      state.isLoadingStoryMeta = true;
      state.storyTitle = "";
      state.storyTagline = "";
      state.savedStoryId = null;
      shouldScrollBottom = true;
      render();
      const lines = path.map((node) => node.text);
      try {
        const created = await api.createStory({ title: null, tagline: null, lines });
        state.savedStoryId = created.id;
        void loadStories();
        try {
          const meta = await api.suggestStoryMeta(lines);
          state.storyTitle = meta.title || "";
          state.storyTagline = meta.tagline || "";
          state.isLoadingStoryMeta = false;
          render();
          try {
            const updated = await api.updateStoryMeta(created.id, { title: state.storyTitle, tagline: state.storyTagline });
            state.stories = state.stories.map((story) => story.uuid === created.id ? { ...story, title: updated.title, tagline: updated.tagline } : story);
          } catch (error) {
            console.error("Failed to update story meta", error);
          }
        } catch (error) {
          console.error("Failed to fetch story meta", error);
          state.isLoadingStoryMeta = false;
        }
      } catch (error) {
        console.error("Failed to save story", error);
        state.isLoadingStoryMeta = false;
      }
      render();
      return true;
    }

    const path = currentPath();
    const isManual = !state.suggestions.includes(text);
    let nextText = text;
    if (isManual) {
      state.isCheckingLine = true;
      state.lineCheckMessage = "Checking your line...";
      state.lineCheckTone = "info";
      render();
      try {
        const result = await api.checkLine(text, path.map((node) => node.text));
        if (!result.is_valid || !result.line) {
          state.lineCheckMessage = result.reason || "Please enter a clearer sentence.";
          state.lineCheckTone = "error";
          state.isCheckingLine = false;
          render();
          return false;
        }
        nextText = result.line;
      } catch (error) {
        console.error("Failed to check line", error);
        state.lineCheckMessage = "Couldn't verify your line. Please try again.";
        state.lineCheckTone = "error";
        state.isCheckingLine = false;
        render();
        return false;
      }
      state.isCheckingLine = false;
      state.lineCheckMessage = null;
      state.lineCheckTone = null;
    }

    const newNodeId = generateId();
    const newNode = {
      id: newNodeId,
      text: nextText,
      parentId: state.headId,
      childrenIds: [],
      createdAt: Date.now(),
      isCustom: isManual,
    };
    if (state.headId && state.nodes[state.headId]) {
      state.nodes[state.headId] = { ...state.nodes[state.headId], childrenIds: [...state.nodes[state.headId].childrenIds, newNodeId] };
    }
    state.nodes[newNodeId] = newNode;
    state.headId = newNodeId;
    shouldScrollBottom = true;
    const nextContext = [...path.map((node) => node.text), nextText];
    void fetchSuggestions(nextContext, canEndStory(path.length + 1));
    render();
    return true;
  }

  function handleBranch(nodeId) {
    state.headId = nodeId;
    state.isEnded = false;
    const branchContext = [];
    let current = state.nodes[nodeId];
    while (current) {
      branchContext.unshift(current.text);
      current = current.parentId ? state.nodes[current.parentId] : null;
    }
    shouldScrollBottom = true;
    void fetchSuggestions(branchContext, canEndStory(branchContext.length));
    render();
  }

  function handleRefreshSuggestions() {
    const context = currentPath().map((node) => node.text);
    void fetchSuggestions(context, canEndStory(context.length));
  }

  async function handleSaveAndView() {
    if (!state.savedStoryId) return;
    state.isSavingStory = true;
    render();
    try {
      const updated = await api.updateStoryMeta(state.savedStoryId, { title: state.storyTitle || "", tagline: state.storyTagline || "" });
      state.stories = state.stories.map((story) => story.uuid === state.savedStoryId ? { ...story, title: updated.title, tagline: updated.tagline } : story);
      const story = await api.getStory(state.savedStoryId);
      state.activeStory = story;
      state.selectedStoryId = state.savedStoryId;
      state.viewMode = "read";
      state.showTreeView = false;
      navigateTo(`/stories/${encodeURIComponent(state.savedStoryId)}`);
    } catch (error) {
      console.error("Failed to save and view story", error);
    } finally {
      state.isSavingStory = false;
      render();
    }
  }

  function handlePromptSignIn() {
    if (state.viewMode === "create" && currentPath().length > 0) {
      saveDraft();
      try {
        window.localStorage.setItem(RESUME_STORAGE_KEY, "true");
      } catch (error) {
        console.error("Failed to set resume flag", error);
      }
    }
    state.showAuthModal = true;
    state.authStatus = "idle";
    state.authError = null;
    render();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      state.isLoggedIn = false;
      state.userEmail = null;
      state.displayName = null;
      state.showProfileModal = false;
      render();
    }
  }

  function getInitialDisplayName() {
    if (state.displayName) return state.displayName;
    if (state.userEmail) return state.userEmail.split("@")[0];
    return "";
  }

  function validateDisplayName(value) {
    if (!value) return "Please enter a display name.";
    if (value.length < 2) return "Display names must be at least 2 characters.";
    return null;
  }

  function handleProfileOpen() {
    if (!state.isLoggedIn) return;
    state.displayNameDraft = getInitialDisplayName();
    state.displayNameError = null;
    state.showProfileModal = true;
    render();
  }

  async function handleDisplayNameSave() {
    const trimmed = state.displayNameDraft.trim();
    const error = validateDisplayName(trimmed);
    if (error) {
      state.displayNameError = error;
      render();
      return;
    }
    state.isUpdatingDisplayName = true;
    state.displayNameError = null;
    render();
    try {
      const result = await api.updateDisplayName(trimmed);
      state.displayName = result.display_name;
      state.userEmail = result.email;
      state.showProfileModal = false;
    } catch (error) {
      console.error("Failed to update display name", error);
      state.displayNameError = "Couldn't update the display name. Please try again.";
    } finally {
      state.isUpdatingDisplayName = false;
      render();
    }
  }

  function handleBack() {
    if (state.viewMode === "read" && state.previousStoryId) {
      void handleSelectStory(state.previousStoryId);
      state.previousStoryId = null;
    } else if (state.viewMode === "create" && state.previousStoryId) {
      void handleSelectStory(state.previousStoryId);
      state.previousStoryId = null;
    } else {
      goHome();
      state.previousStoryId = null;
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      state.shareStatus = "copied";
    } catch (error) {
      console.error("Failed to copy link", error);
      state.shareStatus = "error";
    }
    if (shareResetId) window.clearTimeout(shareResetId);
    shareResetId = window.setTimeout(() => {
      state.shareStatus = "idle";
      render();
    }, 2000);
    render();
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (!action) return;
    event.preventDefault();

    if (action === "home") goHome();
    if (action === "sign-in") handlePromptSignIn();
    if (action === "logout") void handleLogout();
    if (action === "profile-open") handleProfileOpen();
    if (action === "profile-close") {
      state.showProfileModal = false;
      render();
    }
    if (action === "auth-close") {
      state.showAuthModal = false;
      render();
    }
    if (action === "auth-retry") {
      state.authStatus = "idle";
      render();
    }
    if (action === "start-prompt") startNewStory(target.dataset.prompt || "");
    if (action === "start-empty") startNewStory();
    if (action === "select-story") void handleSelectStory(target.dataset.storyId);
    if (action === "select-suggestion") void handleSelectNext(target.dataset.text || "");
    if (action === "refresh-suggestions") handleRefreshSuggestions();
    if (action === "branch-node") handleBranch(target.dataset.nodeId);
    if (action === "save-view") void handleSaveAndView();
    if (action === "restart") startNewStory();
    if (action === "back") handleBack();
    if (action === "toggle-tree") {
      state.showTreeView = !state.showTreeView;
      render();
    }
    if (action === "tree-close") {
      state.showTreeView = false;
      render();
    }
    if (action === "tree-select") void handleSelectStory(target.dataset.storyId);
    if (action === "like-story") void handleLikeStory();
    if (action === "like-line") void handleLikeLine(target.dataset.lineId);
    if (action === "fork-line") {
      const lines = state.activeStory?.lines?.map((line) => line.text) || [];
      void handleForkFromLine(Number(target.dataset.lineIndex || 0), lines);
    }
    if (action === "toggle-alternatives") {
      state.openAlternativeLineId = state.openAlternativeLineId === target.dataset.lineId ? null : target.dataset.lineId;
      render();
    }
    if (action === "close-alternatives") {
      state.openAlternativeLineId = null;
      render();
    }
    if (action === "choose-alt") {
      const lineIndex = Number(target.dataset.lineIndex || 0);
      const altIndex = Number(target.dataset.altIndex || 0);
      const lines = state.activeStory?.lines?.map((line) => line.text) || [];
      const altText = state.activeStory?.lines?.[lineIndex]?.alternatives?.[altIndex];
      void handleForkFromLine(lineIndex, lines, altText);
    }
    if (action === "share") void handleShare();
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    const formName = form.dataset.form;
    if (formName === "home-start") {
      const value = document.getElementById("home-prompt")?.value.trim() || "";
      if (value) startNewStory(value);
    }
    if (formName === "choice-custom") {
      const input = document.getElementById("choice-custom-input");
      const value = input?.value.trim() || "";
      if (value) {
        void handleSelectNext(value).then((result) => {
          if (result !== false && input) input.value = "";
        });
      }
    }
    if (formName === "auth") {
      const email = document.getElementById("email")?.value.trim() || "";
      if (!email || !email.includes("@")) {
        state.authEmail = email;
        state.authError = "Please enter a valid email address";
        render();
        return;
      }
      state.authEmail = email;
      state.authStatus = "loading";
      state.authError = null;
      render();
      api.requestMagicLink(email)
        .then(() => {
          state.userEmail = email;
          state.authStatus = "success";
          render();
          window.setTimeout(() => {
            state.showAuthModal = false;
            render();
          }, 500);
        })
        .catch(() => {
          state.authError = "Something went wrong. Please try again.";
          state.authStatus = "idle";
          render();
        });
    }
    if (formName === "profile") {
      void handleDisplayNameSave();
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.id === "home-prompt") {
      state.homePrompt = target.value;
      const count = document.getElementById("home-prompt-count");
      const button = document.getElementById("home-start-button");
      const hasText = Boolean(target.value.trim());
      if (count) count.textContent = target.value.length > 0 ? `${target.value.length} chars` : "Type your opening...";
      if (button) {
        button.disabled = !hasText;
        button.className = `flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${hasText ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5" : "bg-muted text-muted-foreground cursor-not-allowed"}`;
      }
    }
    if (target.id === "choice-custom-input") {
      const button = target.form?.querySelector("button[type='submit']");
      if (button) button.disabled = !target.value.trim();
    }
    if (target.id === "email") {
      state.authEmail = target.value;
      if (state.authError) state.authError = null;
    }
    if (target.id === "display-name") {
      state.displayNameDraft = target.value;
      if (state.displayNameError) state.displayNameError = null;
    }
    if (target.id === "ending-title") {
      state.storyTitle = target.value;
      autosize(target);
    }
    if (target.id === "ending-tagline") {
      state.storyTagline = target.value;
      autosize(target);
    }
  });

  root.addEventListener("keydown", (event) => {
    if (event.target?.id === "home-prompt" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = event.target.value.trim();
      if (value) startNewStory(value);
    }
  });

  root.addEventListener("focusin", (event) => {
    if (event.target?.id === "choice-custom-input") {
      isTimerPaused = true;
      updateTimerDom();
    }
  });

  root.addEventListener("focusout", (event) => {
    if (event.target?.id === "choice-custom-input") {
      isTimerPaused = false;
      updateTimerDom();
    }
  });

  window.addEventListener("popstate", () => {
    const storyId = getStoryIdFromPath();
    if (storyId) {
      void handleSelectStory(storyId, { skipHistory: true });
    } else {
      goHome(true);
    }
  });

  function init() {
    render();
    void loadStories();
    void loadConfig();
    void loadMe();
    const initialStoryId = window.TALE_TINKER_INITIAL_STORY_ID || getStoryIdFromPath();
    if (initialStoryId) {
      void handleSelectStory(initialStoryId, { replace: true });
    }
  }

  init();
})();
