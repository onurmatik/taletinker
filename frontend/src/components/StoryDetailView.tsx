/**
 * Component for reading a completed story.
 * Allows users to read through the narrative and "fork" (branch) from any point.
 * Includes a sticky navbar and tree view toggle.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, ArrowLeft, Calendar, User, CornerDownRight, X, GitGraph, Share2, Heart } from 'lucide-react';
import { StoryNode } from '../types';
import { cn } from '../utils';

interface StoryDetailViewProps {
  title: string;
  tagline?: string | null;
  path: StoryNode[];
  onFork: (nodeId: string, index: number, alternativeText?: string) => void;
  onBack: () => void;
  onToggleTree?: () => void;
  showTree?: boolean;
  onLikeStory?: () => void;
  onLikeLine?: (nodeId: string) => void;
  isStoryLiked?: boolean;
}

export function StoryDetailView({
  title,
  tagline,
  path,
  onFork,
  onBack,
  onToggleTree,
  showTree,
  onLikeStory,
  onLikeLine,
  isStoryLiked
}: StoryDetailViewProps) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const shareResetRef = useRef<number | null>(null);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
    } catch (error) {
      console.error("Failed to copy link", error);
      setShareStatus('error');
    }

    if (shareResetRef.current) {
      window.clearTimeout(shareResetRef.current);
    }
    shareResetRef.current = window.setTimeout(() => {
      setShareStatus('idle');
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (shareResetRef.current) {
        window.clearTimeout(shareResetRef.current);
      }
    };
  }, []);

  const shareLabel = shareStatus === 'copied' ? 'Link Copied' : shareStatus === 'error' ? 'Copy Failed' : 'Share';
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Sticky Navbar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:inline-block">Back to Library</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-3xl mx-auto px-4 pt-8 pb-32">
        {/* Story Header */}
        <div className="mb-12 text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {tagline && (
            <p className="text-base md:text-lg font-serif italic text-muted-foreground">
              {tagline}
            </p>
          )}

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Unknown Author</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onLikeStory}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors group",
                  isStoryLiked
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                )}
              >
                <Heart className={cn("w-4 h-4 transition-colors", isStoryLiked ? "fill-current" : "group-hover:fill-current group-hover:text-red-500")} />
                <span className="text-sm font-medium">{isStoryLiked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={handleShare}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                  shareStatus === 'copied'
                    ? "bg-primary/10 text-primary"
                    : shareStatus === 'error'
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                )}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">{shareLabel}</span>
              </button>

              {/* Tree View Toggle */}
              {onToggleTree && (
                <button
                  onClick={onToggleTree}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 group",
                    showTree
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <GitGraph className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {showTree ? 'Hide Map' : 'View Map'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Story Lines */}
        <div className="space-y-8 relative">
          <div className="absolute left-0 top-4 bottom-4 w-px bg-border md:left-8" />

          {path.map((node, index) => (
            <StoryLine
              key={node.id}
              node={node}
              index={index}
              onFork={onFork}
              onLike={() => onLikeLine?.(node.id)}
            />
          ))}

          {/* End Marker */}
          <div className="relative pl-6 md:pl-16 pt-8">
            <div className="absolute left-[-5px] md:left-[27px] top-10 w-3 h-3 rounded-full border-2 border-primary bg-background" />
            <p className="text-center font-serif italic text-muted-foreground">
              ~ The End ~
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

interface StoryLineProps {
  node: StoryNode;
  index: number;
  onFork: (nodeId: string, index: number, alternativeText?: string) => void;
  onLike?: () => void;
}

function StoryLine({ node, index, onFork, onLike }: StoryLineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const alternativesCount = node.alternatives?.length || 0;
  const hasAlternatives = alternativesCount > 0;

  // Use props for like state
  const isLiked = node.isLiked;
  const likeCount = node.likes || 0;

  // Handle like toggle
  const handleLike = () => {
    onLike?.();
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        indicatorRef.current &&
        !indicatorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative pl-6 md:pl-16 group pb-2"
    >
      {/* Timeline dot */}
      <div className="absolute left-[-3px] md:left-[29px] top-2 w-2 h-2 rounded-full bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary transition-colors z-10" />

      {/* Permanent Indicators (Moved near dot) */}
      {(likeCount > 0 || hasAlternatives) && (
        <div
          ref={indicatorRef}
          className={cn(
            "absolute top-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground/70 select-none bg-background/80 backdrop-blur-[2px] rounded-full px-1.5 py-0.5 border border-border/20 shadow-sm transition-colors left-6 -translate-x-0 md:left-[22px] md:-translate-x-full",
            hasAlternatives && "cursor-pointer hover:bg-muted/80 hover:text-foreground"
          )}
          onClick={(e) => {
            if (hasAlternatives) {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }
          }}
        >
          {likeCount > 0 && (
            <div className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5 fill-current text-muted-foreground" />
              <span>{likeCount}</span>
            </div>
          )}
          {hasAlternatives && (
            <div className="flex items-center gap-0.5">
              <GitFork className="w-2.5 h-2.5" />
              <span>{alternativesCount}</span>
            </div>
          )}

          {/* Popover for Alternatives */}
          <AnimatePresence>
            {isOpen && hasAlternatives && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="absolute left-0 top-full mt-2 w-72 z-30 bg-card border border-border rounded-xl shadow-xl overflow-hidden origin-top-left md:origin-top-right md:left-auto md:right-0 md:mr-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">Alternative paths</span>
                  <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                  {node.alternatives!.map((altText, altIndex) => (
                    <button
                      key={altIndex}
                      onClick={() => onFork(node.id, index, altText)}
                      className="block w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm group/item"
                    >
                      <span className="line-clamp-3 text-muted-foreground group-hover/item:text-foreground">
                        "{altText}"
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-primary opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <CornerDownRight className="w-3 h-3" />
                        Switch to this path
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="relative">
        {/* Story Text */}
        <div className="relative inline-block text-lg md:text-xl leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
          {node.text}
        </div>

        {/* Hover Actions (Absolute to remove flow margin) */}
        <div
          className="absolute left-0 top-full mt-1 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 origin-top-left"
          ref={containerRef}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors border",
              isLiked
                ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400"
                : "bg-background hover:bg-muted text-muted-foreground border-border/50"
            )}
          >
            <Heart className={cn("w-3 h-3", isLiked && "fill-current")} />
            <span>{isLiked ? 'Liked' : 'Like'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFork(node.id, index);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors border bg-background hover:bg-muted text-muted-foreground border-border/50"
          >
            <GitFork className="w-3 h-3" />
            <span>Fork</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
