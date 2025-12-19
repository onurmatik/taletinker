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
import { INITIAL_SENTENCES, getMockSuggestions, canEndStory, getRandomEnding } from './data/mockStory';
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
  const [isEnded, setIsEnded] = useState(false);
  const [endingText, setEndingText] = useState('');

  // New State for Title, Auth 
  const [storyTitle, setStoryTitle] = useState("The Unnamed Story");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  const [previousStoryId, setPreviousStoryId] = useState<string | null>(null);

  const startNewStory = (initialText?: string) => {
    setNodes({});
    setHeadId(null);
    setIsEnded(false);
    setEndingText('');
    setStoryTitle("The Unnamed Story"); // Reset title
    setPreviousStoryId(selectedStoryId); // Save previous story for back navigation if needed

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
      // Generate suggestions for the next step immediately
      setSuggestions(getMockSuggestions(2));
    } else {
      // Use INITIAL_SENTENCES as suggestions for the start
      const shuffled = [...INITIAL_SENTENCES].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 2));
    }

    setViewMode('create');
  };

  // Get starter prompts for HomeView
  const getStarterPrompts = () => {
    // Just pick the first 2 of a shuffled copy
    return [...INITIAL_SENTENCES].sort(() => 0.5 - Math.random()).slice(0, 2);
  };

  // Memoize starter prompts so they don't change on every render
  const starterPrompts = useMemo(() => getStarterPrompts(), []);

  const handleSelectStory = async (id: string) => {
    // Try to find in runtime first? No, API is truth.
    // If it's a runtime story (newly created but not saved to backend), handle separately?
    // For now, assume we primarily read from backend.
    try {
      const story = await api.getStory(id);
      setActiveStory(story);
      setSelectedStoryId(id);
      setViewMode('read');
      setShowTreeView(false);
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



  const handleForkFromLine = (textLineIndex: number, storyLines: string[], alternativeText?: string) => {
    // If alternativeText is provided, we are SWITCHING to an alternative path in READ mode
    if (alternativeText) {
      // 1. Construct the new story path
      const prefix = storyLines.slice(0, textLineIndex);
      const newLines = [...prefix, alternativeText];

      // 2. Generate a random continuation to make it a "complete" story for viewing
      // We'll add 1-2 random suggestions and an ending
      const extraLinesCount = Math.floor(Math.random() * 2) + 1;
      const suggestions = getMockSuggestions(extraLinesCount * 2); // Get more than needed to pick from

      for (let i = 0; i < extraLinesCount; i++) {
        if (suggestions[i]) newLines.push(suggestions[i]);
      }

      // Add ending
      newLines.push(getRandomEnding());

      // 3. Create a new runtime story object
      const newStoryId = generateId();
      const originalStory = activeStory;
      const newTitle = originalStory ? `${originalStory.title} (Alt)` : "Alternative Story";
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
    if (canEndStory(pathLength)) {
      setSuggestions(["The End", ...getMockSuggestions(1)]);
    } else {
      setSuggestions(getMockSuggestions(2));
    }

    setIsEnded(false);
    setEndingText('');

    // Set title based on the story we forked from
    const story = activeStory;
    if (story) {
      setStoryTitle(`${story.title} (Remix)`);
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

  const handleSelectNext = (text: string) => {
    // Check if user chose to end
    if (text.toLowerCase() === "the end") {
      setEndingText(getRandomEnding());
      setIsEnded(true);
      // Auto-generate a title based on content or random
      const adjectives = ["Magical", "Happy", "Fun", "Little", "Brave", "Super", "Hidden", "Mystery", "Golden"];
      const nouns = ["Adventure", "Friend", "Day", "Journey", "Puppy", "Star", "Secret", "Wish", "Dream"];

      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      setStoryTitle(`The ${randomAdjective} ${randomNoun}`);
      return;
    }

    const newNodeId = generateId();
    const newNode: StoryNodeType = {
      id: newNodeId,
      text: text,
      parentId: headId,
      childrenIds: [],
      createdAt: Date.now(),
      isCustom: !suggestions.includes(text)
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
    if (canEndStory(nextPathLength)) {
      setSuggestions(["The End", ...getMockSuggestions(1)]);
    } else {
      setSuggestions(getMockSuggestions(2));
    }
  };

  const handleBranch = (nodeId: string) => {
    // When branching, we just set the head to that node
    // The previous children are kept in the tree (preserved history), but we start a new path
    setHeadId(nodeId);
    setIsEnded(false);

    // We need to know the path length at this node to decide if we can end
    let length = 0;
    let curr = nodes[nodeId];
    while (curr) {
      length++;
      if (curr.parentId) curr = nodes[curr.parentId];
      else break;
    }

    if (canEndStory(length)) {
      setSuggestions(["The End", ...getMockSuggestions(1)]);
    } else {
      setSuggestions(getMockSuggestions(2));
    }
  };

  const handleRefreshSuggestions = () => {
    if (canEndStory(currentPath.length)) {
      setSuggestions(["The End", ...getMockSuggestions(1)]);
    } else {
      setSuggestions(getMockSuggestions(2));
    }
  };

  const handleAuthSubmit = async (email: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoggedIn(true);
    setUserEmail(email); // Set email
    setTimeout(() => {
      setShowAuthModal(false);
    }, 2000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail(null);
  };

  // Handle Back Navigation
  const handleBack = () => {
    if (viewMode === 'read' && previousStoryId) {
      // If in read mode and we have history, go back to previous story
      setSelectedStoryId(previousStoryId);
      setPreviousStoryId(null); // Clear history (simple 1-level undo for now)
    } else if (viewMode === 'create' && previousStoryId) {
      // If in create mode (forked), go back to reading the original
      setSelectedStoryId(previousStoryId);
      setPreviousStoryId(null);
      setViewMode('read');
    } else {
      // Default back to home
      setViewMode('home');
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
      onHome={() => setViewMode('home')}
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
              title: s.title,
              preview: s.preview,
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
                        title: s.title,
                        date: new Date(s.created_at).toLocaleDateString(),
                        lines: s.lines ? s.lines.map(l => l.text) : [],
                      })), ...runtimeStories]}
                      onSelectStory={(id) => setSelectedStoryId(id)}
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
                      title={story.title}
                      path={detailNodes}
                      onFork={(nodeId, index, altText) => handleForkFromLine(index, lineTexts, altText)}
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
                  text={endingText}
                  storyTitle={storyTitle}
                  setStoryTitle={setStoryTitle}
                  isLoggedIn={isLoggedIn}
                  onRestart={startNewStory}
                  onSignUp={() => setShowAuthModal(true)}
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
