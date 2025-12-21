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
import { INITIAL_SENTENCES, canEndStory } from './data/mockStory';
import { api, StorySummary, StoryData } from './api';
import { Book, X, ArrowLeft, GitGraph } from 'lucide-react'; // Import GitGraph icon
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

  // New State for Title, Auth 
  const [storyTitle, setStoryTitle] = useState('');
  const [storyTagline, setStoryTagline] = useState('');
  const [savedStoryId, setSavedStoryId] = useState<string | null>(null);
  const [isLoadingStoryMeta, setIsLoadingStoryMeta] = useState(false);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const hasInitializedRoute = useRef(false);

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
    api.getMe()
      .then((res) => {
        setIsLoggedIn(res.is_authenticated);
        setUserEmail(res.email);
      })
      .catch((err) => console.error("Failed to load user", err));
  }, []);

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

      // 2. Generate a random continuation to make it a "complete" story for viewing
      // We'll add 1-2 random suggestions and an ending
      const extraLinesCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < extraLinesCount; i++) {
        try {
          const options = await api.suggestLines(newLines);
          const filteredOptions = options
            .map((option) => option?.trim())
            .filter((option): option is string => Boolean(option))
            .filter((option) => option.toLowerCase() !== "the end");

          if (filteredOptions.length === 0) break;

          const nextLine = filteredOptions[Math.floor(Math.random() * filteredOptions.length)];
          if (nextLine) newLines.push(nextLine);
        } catch (error) {
          console.error("Failed to fetch suggestions", error);
          break;
        }
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

  const handleSelectNext = async (text: string) => {
    setLineCheckMessage(null);
    setLineCheckTone(null);

    // Check if user chose to end
    if (text.toLowerCase() === "the end") {
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

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggedIn(false);
      setUserEmail(null);
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
      onSignIn={() => setShowAuthModal(true)}
      onLogout={handleLogout}
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
              length: s.length
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
    </div>
  );
}
