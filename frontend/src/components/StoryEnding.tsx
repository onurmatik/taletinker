/**
 * Component to display the story ending.
 * Allows editing title/tagline, saving, and restarting.
 */
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, BookOpen, Pencil, ArrowRight } from 'lucide-react';
import { cn } from '../utils';

interface StoryEndingProps {
  storyTitle: string;
  storyTagline: string;
  setStoryTitle: (title: string) => void;
  setStoryTagline: (tagline: string) => void;
  isLoadingMeta: boolean;
  isSaving?: boolean;
  canSaveAndView?: boolean;
  onRestart: () => void;
  onSaveAndView: () => void;
}

export function StoryEnding({ 
  storyTitle, 
  storyTagline,
  setStoryTitle, 
  setStoryTagline,
  isLoadingMeta,
  isSaving = false,
  canSaveAndView = true,
  onRestart, 
  onSaveAndView
}: StoryEndingProps) {
  const canSave = canSaveAndView && !isLoadingMeta && !isSaving;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const taglineRef = useRef<HTMLTextAreaElement>(null);

  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (!isLoadingMeta) {
      autosize(titleRef.current);
      autosize(taglineRef.current);
    }
  }, [storyTitle, storyTagline, isLoadingMeta]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="text-center py-12 px-4 max-w-2xl mx-auto space-y-12"
    >
      {/* Header Icon */}
      <div className="flex justify-center">
        <div className="p-4 rounded-full bg-primary/10 text-primary relative group">
          <BookOpen className="w-8 h-8" />
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      {/* Editable Title Section */}
      <div className="space-y-6">
        <div className="uppercase tracking-widest text-xs font-semibold text-muted-foreground">
          The End
        </div>
        {isLoadingMeta ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 md:h-12 rounded-lg bg-muted/40 w-64 mx-auto" />
            <div className="h-4 rounded bg-muted/30 w-72 mx-auto" />
          </div>
        ) : (
          <>
            <div className="w-full max-w-2xl mx-auto text-left space-y-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Title
              </div>
              <div className="relative">
                <textarea
                  ref={titleRef}
                  value={storyTitle}
                  onChange={(e) => {
                    setStoryTitle(e.target.value);
                    autosize(titleRef.current);
                  }}
                  className={cn(
                    "w-full min-h-[84px] resize-none rounded-2xl border border-primary/30 bg-card/60 px-5 py-4",
                    "text-2xl md:text-5xl font-serif font-bold text-foreground text-center",
                    "placeholder:text-muted-foreground/50 shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  )}
                  placeholder="Untitled Story"
                />
                <Pencil className="w-4 h-4 text-muted-foreground absolute right-4 top-4" />
              </div>
            </div>
            <div className="w-full max-w-2xl mx-auto text-left space-y-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Tagline
              </div>
              <div className="relative">
                <textarea
                  ref={taglineRef}
                  value={storyTagline}
                  onChange={(e) => {
                    setStoryTagline(e.target.value);
                    autosize(taglineRef.current);
                  }}
                  className={cn(
                    "w-full min-h-[56px] resize-none rounded-2xl border border-primary/20 bg-card/40 px-5 py-3",
                    "text-base md:text-lg font-serif italic text-foreground text-center",
                    "placeholder:text-muted-foreground/50 shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60"
                  )}
                  placeholder="Add a short tagline"
                />
                <Pencil className="w-3.5 h-3.5 text-muted-foreground absolute right-4 top-4" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 mt-12">
        <div className="flex justify-center">
          <button
            onClick={onSaveAndView}
            disabled={!canSave}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all shadow-md",
              !canSave
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg"
            )}
          >
            <ArrowRight className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save and View Story"}
          </button>
        </div>
        {/* Secondary Actions */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onRestart}
            className={cn(
              "group inline-flex items-center gap-2 px-6 py-3 rounded-full",
              "text-muted-foreground hover:text-foreground font-medium text-sm",
              "hover:bg-secondary/50 transition-colors"
            )}
          >
            <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
            Start New Story
          </button>
        </div>
      </div>
    </motion.div>
  );
}
