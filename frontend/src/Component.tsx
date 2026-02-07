/**
 * Main application component for TaleTinker.
 * Manages the story state, node tree, and interaction logic.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // We'll need a simple ID generator, but standard lib doesn't have one. I'll use Math.random for now to avoid external dep issues if uuid isn't avail.
import { StoryNode } from './components/StoryNode';
import { ChoicePanel } from './components/ChoicePanel';
import { StoryEnding } from './components/StoryEnding';
import { HomeView } from './components/HomeView';
import { StoryDetailView } from './components/StoryDetailView';
import { StoryTreeView } from './components/StoryTreeView'; // Import new component
import { Navbar } from './components/Navbar'; // Import Navbar
import { StoryNode as StoryNodeType, SavedStory } from './types'; // Import SavedStory
import { INITIAL_SENTENCES } from './data/mockStory';
import { api, StorySummary, StoryData } from './api';
import { Book, X, ArrowLeft, GitGraph, User, Loader2 } from 'lucide-react'; // Import GitGraph icon
import { MagicLinkAuth } from './components/MagicLinkAuth';
import { motion, AnimatePresence } from 'framer-motion';

// Simple ID generator since we might not have uuid
const generateId = () => Math.random().toString(36).substring(2, 9);

type ViewMode = 'home' | 'create' | 'read';

export function TaleTinkerApp() {
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [runtimeStories, setRuntimeStories] = useState<SavedStory[]>([]);
  const [stories, setStories] = useState<StorySummary[]>([]); // API Stories
  const [activeStory, setActiveStory] = useState<StoryData | null>(null); // Full story data
  const [showTreeView, setShowTreeView] = useState(false); // State to toggle tree view

  // Story State
  const [nodes, setNodes] = useState<Record<string, StoryNodeType>>({});
  const [headId, setHeadId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCheckingLine, setIsCheckingLine] = useState(false);
  const [lineCheckMessage, setLineCheckMessage] = useState<string | null>(null);
  const [lineCheckTone, setLineCheckTone] = useState<'info' | 'error' | null>(null);
  const [isEnded, setIsEnded] = useState(false);
  const [minStoryLines, setMinStoryLines] = useState(5);
  const [anonSigninLine, setAnonSigninLine] = useState(3);

  // New State for Title, Auth 
  const [storyTitle, setStoryTitle] = useState('');
  const [storyTagline, setStoryTagline] = useState('');
  const [savedStoryId, setSavedStoryId] = useState<string | null>(null);
  const [isLoadingStoryMeta, setIsLoadingStoryMeta] = useState(false);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const hasInitializedRoute = useRef(false);
  const hasResumedDraft = useRef(false);

  const canEndStory = (pathLength: number) => pathLength >= minStoryLines;
  const DRAFT_STORAGE_KEY = 'taletinker:story-draft';
  const RESUME_STORAGE_KEY = 'taletinker:resume-after-login';

  const buildPathFromDraft = (draftNodes: Record<string, StoryNodeType>, draftHeadId: string | null) => {
    const path: StoryNodeType[] = [];
    let currentId = draftHeadId;
    while (currentId) {
      const node = draftNodes[currentId];
      if (node) {
        path.unshift(node);
        currentId = node.parentId;
      } else {
        break;
      }
    }
    return path;
  };

  const saveDraft = () => {
    if (viewMode !== 'create' || isEnded || !headId || currentPath.length === 0) {
      return;
    }
    const payload = {
      version: 1,
      nodes,
      headId,
      storyTitle
    };
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to save draft", error);
    }
  };

  const shouldPreserveDraft = () => {
    try {
      return window.localStorage.getItem(RESUME_STORAGE_KEY) === 'true';
    } catch (error) {
      console.error("Failed to read resume flag", error);
      return false;
    }
  };

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear draft", error);
    }
  };

  // Derive current linear path by tracing back parents
  const currentPath = useMemo(() => {
    const path: StoryNodeType[] = [];
    let currentId = headId;
    while (currentId) {
      const node = nodes[currentId];
      if (node) {
        path.unshift(node);
        currentId = node.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [nodes, headId]);

  // Refs for scrolling
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when head changes
  useEffect(() => {
    // Only scroll if in create mode
    if (viewMode === 'create') {
      // Small delay to allow render
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [headId, isEnded, viewMode]);

  // Load stories from API
  useEffect(() => {
    api.listStories().then(setStories).catch(err => console.error("Failed to load stories", err));
  }, []);

  useEffect(() => {
    api.getStoryConfig()
      .then((config) => {
        setMinStoryLines(config.min_story_lines);
        setAnonSigninLine(config.anon_signin_line);
      })
      .catch((err) => console.error("Failed to load story config", err));
  }, []);

  useEffect(() => {
    api.getMe()
      .then((res) => {
        setIsLoggedIn(res.is_authenticated);
        setUserEmail(res.email);
        setDisplayName(res.display_name);
      })
      .catch((err) => console.error("Failed to load user", err));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setShowProfileModal(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (viewMode === 'create' && !isEnded && currentPath.length > 0) {
      saveDraft();
      return;
    }
    if (isEnded || viewMode === 'read') {
      clearDraft();
      return;
    }
    if (viewMode === 'home' && !shouldPreserveDraft()) {
      clearDraft();
    }
  }, [viewMode, isEnded, currentPath.length, headId, nodes, storyTitle]);

  useEffect(() => {
    if (!isLoggedIn || hasResumedDraft.current) return;
    let shouldResume = false;
    try {
      shouldResume = window.localStorage.getItem(RESUME_STORAGE_KEY) === 'true';
    } catch (error) {
      console.error("Failed to read resume flag", error);
    }
    if (!shouldResume) return;
    hasResumedDraft.current = true;

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { nodes?: Record<string, StoryNodeType>; headId?: string | null; storyTitle?: string };
      if (!draft.nodes || !draft.headId) return;

      setNodes(draft.nodes);
      setHeadId(draft.headId);
      setStoryTitle(draft.storyTitle || '');
      setIsEnded(false);
      setSuggestions([]);
      setShowTreeView(false);
      setLineCheckMessage(null);
      setLineCheckTone(null);
      setIsCheckingLine(false);
      setViewMode('create');

      const path = buildPathFromDraft(draft.nodes, draft.headId);
      const context = path.map((node) => node.text);
      void fetchSuggestions(context, canEndStory(context.length));
    } catch (error) {
      console.error("Failed to restore draft", error);
    } finally {
      try {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear resume flag", error);
      }
    }
  }, [isLoggedIn]);

  const navigateTo = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
  };

  const getStoryIdFromPath = () => {
    const match = window.location.pathname.match(/^\/stories\/([^/]+)$/);
    return match ? match[1] : null;
  };

  const goHome = (skipHistory = false) => {
    setViewMode('home');
    setSelectedStoryId(null);
    setActiveStory(null);
    setShowTreeView(false);
    if (!skipHistory && window.location.pathname !== '/') {
      navigateTo('/');
    }
  };

  useEffect(() => {
    if (hasInitializedRoute.current) return;
    hasInitializedRoute.current = true;
    const storyId = getStoryIdFromPath();
    if (storyId) {
      void handleSelectStory(storyId, { replace: true });
    }

    const handlePopState = () => {
      const nextStoryId = getStoryIdFromPath();
      if (nextStoryId) {
        void handleSelectStory(nextStoryId, { skipHistory: true });
      } else {
        goHome(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [previousStoryId, setPreviousStoryId] = useState<string | null>(null);
  const suggestionRequestId = useRef(0);

  const fetchSuggestions = async (context: string[], includeEndOption: boolean) => {
    const requestId = ++suggestionRequestId.current;
    setIsLoadingSuggestions(true);
    setSuggestions([]);

    try {
      const options = await api.suggestLines(context);
      if (suggestionRequestId.current !== requestId) return;

      const trimmedOptions = options
        .map((option) => option?.trim())
        .filter((option): option is string => Boolean(option))
        .filter((option) => option.toLowerCase() !== "the end");
      const limitedOptions = includeEndOption ? trimmedOptions.slice(0, 1) : trimmedOptions.slice(0, 2);
      const nextSuggestions = includeEndOption ? ["The End", ...limitedOptions] : limitedOptions;

      setSuggestions(nextSuggestions);
      setIsLoadingSuggestions(false);
    } catch (error) {
      if (suggestionRequestId.current !== requestId) return;
      console.error("Failed to fetch suggestions", error);
      setSuggestions(includeEndOption ? ["The End"] : []);
      setIsLoadingSuggestions(false);
    }
  };

  const startNewStory = (initialText?: string) => {
    setNodes({});
    setHeadId(null);
    setIsEnded(false);
    setStoryTitle(''); // Reset title
    setStoryTagline('');
    setSavedStoryId(null);
    setIsLoadingStoryMeta(false);
    setIsSavingStory(false);
    setPreviousStoryId(selectedStoryId); // Save previous story for back navigation if needed
    setSuggestions([]);
    setIsCheckingLine(false);
    setLineCheckMessage(null);
    setLineCheckTone(null);

    if (initialText) {
      // Create first node immediately
      const newId = generateId();
      const newNode: StoryNodeType = {
        id: newId,
        text: initialText,
        parentId: null,
        childrenIds: [],
        createdAt: Date.now(),
        isCustom: true
      };
      setNodes({ [newId]: newNode });
      setHeadId(newId);
      void fetchSuggestions([initialText], false);
    } else {
      void fetchSuggestions([], false);
    }

    setViewMode('create');
    if (window.location.pathname !== '/') {
      navigateTo('/', true);
    }
  };

  // Get starter prompts for HomeView
  const getStarterPrompts = () => {
    // Just pick the first 2 of a shuffled copy
    return [...INITIAL_SENTENCES].sort(() => 0.5 - Math.random()).slice(0, 2);
  };

  // Memoize starter prompts so they don't change on every render
  const starterPrompts = useMemo(() => getStarterPrompts(), []);

  const handleSelectStory = async (id: string, options?: { replace?: boolean; skipHistory?: boolean }) => {
    // Try to find in runtime first? No, API is truth.
    // If it's a runtime story (newly created but not saved to backend), handle separately?
    // For now, assume we primarily read from backend.
    try {
      const story = await api.getStory(id);
      setActiveStory(story);
      setSelectedStoryId(id);
      setViewMode('read');
      setShowTreeView(false);
      if (!options?.skipHistory) {
        navigateTo(`/stories/${id}`, options?.replace);
      }
    } catch (e) {
      console.error("Could not fetch story", e);
      // Fallback or error UI
    }
  };

  const handleLikeStory = async () => {
    if (!activeStory) return;
    try {
      const res = await api.likeStory(activeStory.uuid);
      setActiveStory(prev => prev ? ({ ...prev, is_liked: res.is_liked, like_count: res.like_count }) : null);
      // Also update list
      setStories(prev => prev.map(s => s.id === activeStory.id ? { ...s, is_liked: res.is_liked, like_count: res.like_count } : s));
    } catch (e) { console.error(e); }
  };

  const handleLikeLine = async (lineId: string) => {
    try {
      const res = await api.likeLine(lineId);
      setActiveStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          lines: prev.lines.map(line => line.id === lineId ? { ...line, is_liked: res.is_liked, like_count: res.like_count } : line)
        };
      });
    } catch (e) { console.error(e); }
  };



  const handleForkFromLine = async (textLineIndex: number, storyLines: string[], alternativeText?: string) => {
    // If alternativeText is provided, we are SWITCHING to an alternative path in READ mode
    if (alternativeText) {
      // 1. Construct the new story path
      const prefix = storyLines.slice(0, textLineIndex);
      const newLines = [...prefix, alternativeText];

      // 2. Add one follow-up line from a single suggestion call
      try {
        const options = await api.suggestLines(newLines);
        const filteredOptions = options
          .map((option) => option?.trim())
          .filter((option): option is string => Boolean(option))
          .filter((option) => option.toLowerCase() !== "the end");
        if (filteredOptions.length > 0) {
          const nextLine = filteredOptions[Math.floor(Math.random() * filteredOptions.length)];
          if (nextLine) newLines.push(nextLine);
        }
      } catch (error) {
        console.error("Failed to fetch suggestion", error);
      }

      // 3. Create a new runtime story object
      const newStoryId = generateId();
      const originalStory = activeStory;
      const baseTitle = originalStory?.title || "Untitled Story";
      const newTitle = `${baseTitle} (Alt)`;
      // Ensure we have a rootId. If original has one, use it. If not, the original IS the root (legacy).
      // For API stories, we treat the current story as the root reference for now if we don't have better info.
      const rootId = originalStory?.uuid || newStoryId;

      const newStory: SavedStory = {
        id: newStoryId,
        rootId,
        title: newTitle,
        date: new Date().toLocaleDateString(),

        lines: newLines,
        alternatives: {} // Fresh path, no alternatives for now (or could add random ones)
      };

      // 4. Update state to view this new story
      setRuntimeStories(prev => [...prev, newStory]);
      setPreviousStoryId(selectedStoryId); // Save the current story ID before switching
      setSelectedStoryId(newStoryId);
      // viewMode remains 'read', so the UI simply updates to the new story
      navigateTo(`/stories/${newStoryId}`);
      return;
    }

    // --- Standard Fork (Edit Mode) Logic Below ---

    // Reconstruct the story state up to this index
    const newNodes: Record<string, StoryNodeType> = {};
    let previousId: string | null = null;
    let newHeadId: string | null = null;

    // Create nodes for all lines up to the forked point
    // If alternativeText is provided, we replace the line at textLineIndex with it
    const effectiveLines = [...storyLines];
    if (alternativeText) {
      effectiveLines[textLineIndex] = alternativeText;
    }

    // We only go UP TO the forked index. Everything after is discarded (new path starts)
    for (let i = 0; i <= textLineIndex; i++) {
      const id = generateId();
      const text = effectiveLines[i];
      const node: StoryNodeType = {
        id,
        text,
        parentId: previousId,
        childrenIds: [],
        createdAt: Date.now() + i * 1000, // Stagger times
        isCustom: false // Assume from library is "ai" or "standard"
      };

      newNodes[id] = node;

      // Link parent to this child
      if (previousId && newNodes[previousId]) {
        newNodes[previousId].childrenIds.push(id);
      }

      previousId = id;
      newHeadId = id;
    }

    // Set state
    setNodes(newNodes);
    setHeadId(newHeadId);

    // Generate suggestions based on this new head
    // Determine path length
    const pathLength = textLineIndex + 1;
    const context = effectiveLines.slice(0, pathLength);
    void fetchSuggestions(context, canEndStory(pathLength));

    setIsEnded(false);

    // Set title based on the story we forked from
    const story = activeStory;
    if (story) {
      const baseTitle = story.title || "Untitled Story";
      setStoryTitle(`${baseTitle} (Remix)`);
    } else {
      setStoryTitle("Forked Story");
    }

    // Save previous story ID before switching modes
    setPreviousStoryId(selectedStoryId);
    // Switch view
    setViewMode('create');
  };

  const handleSelectNext = async (text: string) => {
    setLineCheckMessage(null);
    setLineCheckTone(null);

    // Check if user chose to end
    if (text.toLowerCase() === "the end") {
      if (!canEndStory(currentPath.length)) {
        setLineCheckMessage(`Write at least ${Math.max(minStoryLines - currentPath.length, 0)} more line(s) to end the story.`);
        setLineCheckTone('error');
        return false;
      }
      setIsEnded(true);
      setIsLoadingStoryMeta(true);
      setStoryTitle('');
      setStoryTagline('');
      setSavedStoryId(null);

      const lines = currentPath.map((node) => node.text);

      try {
        const created = await api.createStory({ title: null, tagline: null, lines });
        setSavedStoryId(created.id);
        void api.listStories().then(setStories).catch(err => console.error("Failed to refresh stories", err));
        try {
          const meta = await api.suggestStoryMeta(lines);
          const nextTitle = meta.title || '';
          const nextTagline = meta.tagline || '';
          setStoryTitle(nextTitle);
          setStoryTagline(nextTagline);
          setIsLoadingStoryMeta(false);
          try {
            await api.updateStoryMeta(created.id, {
              title: nextTitle,
              tagline: nextTagline
            });
            setStories(prev =>
              prev.map(story => story.uuid === created.id ? { ...story, title: nextTitle, tagline: nextTagline } : story)
            );
          } catch (error) {
            console.error("Failed to update story meta", error);
          }
        } catch (error) {
          console.error("Failed to fetch story meta", error);
          setIsLoadingStoryMeta(false);
        }
      } catch (error) {
        console.error("Failed to save story", error);
        setIsLoadingStoryMeta(false);
      }
      return true;
    }

    const isManual = !suggestions.includes(text);
    let nextText = text;

    if (isManual) {
      setIsCheckingLine(true);
      setLineCheckMessage("Checking your line...");
      setLineCheckTone('info');
      try {
        const res = await api.checkLine(text, currentPath.map((node) => node.text));
        if (!res.is_valid || !res.line) {
          setLineCheckMessage(res.reason || "Please enter a clearer sentence.");
          setLineCheckTone('error');
          setIsCheckingLine(false);
          return false;
        }
        nextText = res.line;
      } catch (error) {
        console.error("Failed to check line", error);
        setLineCheckMessage("Couldn't verify your line. Please try again.");
        setLineCheckTone('error');
        setIsCheckingLine(false);
        return false;
      }
      setIsCheckingLine(false);
      setLineCheckMessage(null);
      setLineCheckTone(null);
    }

    const newNodeId = generateId();
    const newNode: StoryNodeType = {
      id: newNodeId,
      text: nextText,
      parentId: headId,
      childrenIds: [],
      createdAt: Date.now(),
      isCustom: isManual
    };

    setNodes(prev => {
      if (headId && prev[headId]) {
        const parent = prev[headId];
        return {
          ...prev,
          [headId]: { ...parent, childrenIds: [...parent.childrenIds, newNodeId] },
          [newNodeId]: newNode
        };
      }
      // If no headId (first node), just add the new node
      return {
        ...prev,
        [newNodeId]: newNode
      };
    });

    setHeadId(newNodeId);

    // Prepare next suggestions
    // Current path length + 1 (for the new node)
    const nextPathLength = currentPath.length + 1;
    const nextContext = [...currentPath.map((node) => node.text), nextText];
    void fetchSuggestions(nextContext, canEndStory(nextPathLength));
    return true;
  };

  const handleBranch = (nodeId: string) => {
    // When branching, we just set the head to that node
    // The previous children are kept in the tree (preserved history), but we start a new path
    setHeadId(nodeId);
    setIsEnded(false);

    // We need to know the path length at this node to decide if we can end
    const branchContext: string[] = [];
    let curr = nodes[nodeId];
    while (curr) {
      branchContext.unshift(curr.text);
      if (curr.parentId) curr = nodes[curr.parentId];
      else break;
    }

    void fetchSuggestions(branchContext, canEndStory(branchContext.length));
  };

  const handleRefreshSuggestions = () => {
    const context = currentPath.map((node) => node.text);
    void fetchSuggestions(context, canEndStory(context.length));
  };

  const handleSaveAndView = async () => {
    if (!savedStoryId) return;
    setIsSavingStory(true);
    try {
      const updated = await api.updateStoryMeta(savedStoryId, {
        title: storyTitle || '',
        tagline: storyTagline || ''
      });
      setStories(prev =>
        prev.map(story => story.uuid === savedStoryId ? { ...story, title: updated.title, tagline: updated.tagline } : story)
      );
      const story = await api.getStory(savedStoryId);
      setActiveStory(story);
      setSelectedStoryId(savedStoryId);
      setViewMode('read');
      setShowTreeView(false);
      navigateTo(`/stories/${savedStoryId}`);
    } catch (error) {
      console.error("Failed to save and view story", error);
    } finally {
      setIsSavingStory(false);
    }
  };

  const handleAuthSubmit = async (email: string) => {
    await api.requestMagicLink(email);
    setUserEmail(email);
    setTimeout(() => {
      setShowAuthModal(false);
    }, 500);
  };

  const handlePromptSignIn = () => {
    if (viewMode === 'create' && currentPath.length > 0) {
      saveDraft();
      try {
        window.localStorage.setItem(RESUME_STORAGE_KEY, 'true');
      } catch (error) {
        console.error("Failed to set resume flag", error);
      }
    }
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggedIn(false);
      setUserEmail(null);
      setDisplayName(null);
    }
  };

  const getInitialDisplayName = () => {
    if (displayName) {
      return displayName;
    }
    if (userEmail) {
      return userEmail.split('@')[0];
    }
    return '';
  };

  const validateDisplayName = (value: string) => {
    if (!value) {
      return 'Please enter a display name.';
    }
    if (value.length < 2) {
      return 'Display names must be at least 2 characters.';
    }
    return null;
  };

  const handleProfileOpen = () => {
    if (!isLoggedIn) return;
    setDisplayNameDraft(getInitialDisplayName());
    setDisplayNameError(null);
    setShowProfileModal(true);
  };

  const handleDisplayNameSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = displayNameDraft.trim();
    const error = validateDisplayName(trimmed);
    if (error) {
      setDisplayNameError(error);
      return;
    }
    setIsUpdatingDisplayName(true);
    setDisplayNameError(null);
    try {
      const res = await api.updateDisplayName(trimmed);
      setDisplayName(res.display_name);
      setUserEmail(res.email);
      setShowProfileModal(false);
    } catch (error) {
      console.error("Failed to update display name", error);
      setDisplayNameError("Couldn't update the display name. Please try again.");
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  // Handle Back Navigation
  const handleBack = () => {
    if (viewMode === 'read' && previousStoryId) {
      // If in read mode and we have history, go back to previous story
      void handleSelectStory(previousStoryId);
      setPreviousStoryId(null); // Clear history (simple 1-level undo for now)
    } else if (viewMode === 'create' && previousStoryId) {
      // If in create mode (forked), go back to reading the original
      void handleSelectStory(previousStoryId);
      setPreviousStoryId(null);
    } else {
      // Default back to home
      goHome();
      setPreviousStoryId(null);
    }
  };

  // Helper for rendering the navbar with context
  const renderNavbar = (customLeftAction?: React.ReactNode) => (
    <Navbar
      isLoggedIn={isLoggedIn}
      userEmail={userEmail}
      onSignIn={handlePromptSignIn}
      onLogout={handleLogout}
      onProfile={handleProfileOpen}
      onHome={goHome}
      leftAction={customLeftAction}
    />
  );

  return (
    <div className="min-h-screen font-sans selection:bg-primary/20 bg-background text-foreground">

      {/* View Routing */}
      {viewMode === 'home' && (
        <>
          {renderNavbar()}
          <HomeView
            stories={stories.map(s => ({
              id: s.uuid, // Use UUID for selection
              title: s.title || 'Untitled Story',
              preview: s.tagline || s.preview,
              date: new Date(s.created_at).toLocaleDateString(),
              length: s.length,
              authorName: s.author_name,
              likeCount: s.like_count
            }))}
            onStartNew={startNewStory}
            onSelectStory={handleSelectStory}
            starterPrompts={starterPrompts}
          />
        </>
      )}

      {viewMode === 'read' && (
        <>
          {/* Main Layout Container - Full Height, Hidden Overflow */}
          <div className="flex h-screen overflow-hidden bg-background">

            {/* Left Side Tree Panel - Animate width/presence */}
            <AnimatePresence mode="wait">
              {showTreeView && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-shrink-0 border-r border-border h-full z-20 shadow-xl bg-background overflow-hidden relative"
                >
                  <div className="absolute inset-0 w-[280px]">
                    <StoryTreeView
                      currentStoryId={selectedStoryId || ''}
                      stories={[...stories.map(s => ({
                        id: s.uuid,
                        rootId: s.root_node_id || s.uuid, // Use root_node_id if available, else self (new root)
                        title: s.title || 'Untitled Story',
                        date: new Date(s.created_at).toLocaleDateString(),
                        lines: s.lines ? s.lines.map(l => l.text) : [],
                      })), ...runtimeStories]}
                      onSelectStory={(id) => {
                        void handleSelectStory(id);
                      }}
                      onClose={() => setShowTreeView(false)}
                      className="h-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content - Flex Grow */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {(() => {
                const story = activeStory;
                if (!story) {
                  // Show valid runtime story if available?
                  // For now loading state or error.
                  return <div className="p-8 text-center text-muted-foreground">Loading story...</div>;
                }

                const detailNodes: StoryNodeType[] = story.lines.map((line, i) => {
                  // Map API line to StoryNode
                  return {
                    id: line.id, // Real UUID
                    text: line.text,
                    parentId: i > 0 ? story.lines[i - 1].id : null,
                    childrenIds: [],
                    createdAt: Date.now(),
                    alternatives: [], // API specific structure needed for trees? Current flat API returns one path.
                    likes: line.like_count,
                    isLiked: line.is_liked
                  };
                });

                // Legacy support for onFork (requires mapping back to string array?)
                // handleForkFromLine expects string[].
                const lineTexts = story.lines.map(l => l.text);

                return (
                  <div className="h-full overflow-y-auto">
                    <StoryDetailView
                      title={story.title || 'Untitled Story'}
                      tagline={story.tagline}
                      authorName={story.author_name}
                      path={detailNodes}
                      onFork={(nodeId, index, altText) => {
                        void handleForkFromLine(index, lineTexts, altText);
                      }}
                      onBack={handleBack}
                      onToggleTree={() => setShowTreeView(!showTreeView)}
                      showTree={showTreeView}
                      onLikeStory={handleLikeStory}
                      onLikeLine={handleLikeLine}
                      isStoryLiked={story.is_liked}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {viewMode === 'create' && (
        <>
          {renderNavbar()}
          <main className="container max-w-3xl mx-auto px-4 pt-24 pb-32 min-h-screen flex flex-col">

            {/* Story Flow */}
            <div className="flex-1">
              {currentPath.map((node, index) => (
                <StoryNode
                  key={node.id}
                  node={node}
                  index={index}
                  isLast={index === currentPath.length - 1 && !isEnded}
                  onBranch={() => handleBranch(node.id)}
                />
              ))}

              {/* Ending */}
              {isEnded && (
                <StoryEnding
                  storyTitle={storyTitle}
                  setStoryTitle={setStoryTitle}
                  storyTagline={storyTagline}
                  setStoryTagline={setStoryTagline}
                  isLoadingMeta={isLoadingStoryMeta}
                  isSaving={isSavingStory}
                  canSaveAndView={Boolean(savedStoryId)}
                  onRestart={startNewStory}
                  onSaveAndView={handleSaveAndView}
                />
              )}

              <div ref={bottomRef} className="h-4" />
            </div>

            {/* Input Area */}
            {!isEnded && (
              <div className="sticky bottom-6 z-40">
                {!isLoggedIn && currentPath.length >= anonSigninLine ? (
                  <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-6 text-center">
                    <div className="text-sm uppercase tracking-widest text-muted-foreground">
                      Save Your Story
                    </div>
                    <h3 className="mt-3 text-xl font-serif font-bold text-foreground">
                      Sign in to keep writing
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You're making great progress. Sign in so we can save your story. It's free.
                    </p>
                    <button
                      onClick={handlePromptSignIn}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
                    >
                      Sign In to Save
                    </button>
                  </div>
                ) : (
                  <ChoicePanel
                    suggestions={suggestions}
                    onSelect={handleSelectNext}
                    onRefresh={handleRefreshSuggestions}
                    timeoutSeconds={15}
                    isLoading={isLoadingSuggestions}
                    disabled={isCheckingLine}
                    statusMessage={lineCheckMessage}
                    statusTone={lineCheckTone || undefined}
                  />
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* Global Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute -top-12 right-0 p-2 text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <MagicLinkAuth
                title="Sign in to TaleTinker"
                description={isLoggedIn ? "You are already signed in." : "Enter your email to continue."}
                onSubmit={handleAuthSubmit}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute -top-12 right-0 p-2 text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-background w-full rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/30 rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Choose your display name
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        This will appear as the author name on your stories.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleDisplayNameSave} className="mt-8 space-y-5">
                    <div className="space-y-2">
                      <label
                        htmlFor="display-name"
                        className="text-xs font-bold text-muted-foreground tracking-wider uppercase pl-1"
                      >
                        Display Name
                      </label>
                      <input
                        id="display-name"
                        type="text"
                        value={displayNameDraft}
                        onChange={(event) => {
                          setDisplayNameDraft(event.target.value);
                          if (displayNameError) {
                            setDisplayNameError(null);
                          }
                        }}
                        className="w-full bg-secondary/20 hover:bg-secondary/30 focus:bg-background transition-colors border border-border/50 focus:border-primary/50 rounded-xl py-3.5 px-4 outline-none text-lg text-foreground placeholder:text-muted-foreground/40 focus:ring-4 focus:ring-primary/5"
                        placeholder="Storyteller"
                        autoComplete="name"
                        autoFocus
                        maxLength={150}
                      />
                      {displayNameError && (
                        <p className="text-sm text-destructive pl-1">
                          {displayNameError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingDisplayName}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isUpdatingDisplayName ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Display Name"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
