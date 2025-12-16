/**
 * Component for reading a completed story.
 * Allows users to read through the narrative and "fork" (branch) from any point.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, ArrowLeft, BookOpen, Calendar, User, CornerDownRight, X } from 'lucide-react';
import { StoryNode } from '../types';
import { cn } from '../utils';

interface StoryDetailViewProps {
  title: string;
  path: StoryNode[];
  onFork: (nodeId: string, index: number, alternativeText?: string) => void;
  onBack: () => void;
}

export function StoryDetailView({ title, path, onFork, onBack }: StoryDetailViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans pt-16">
      {/* Content */}
      <main className="container max-w-3xl mx-auto px-4 pt-8 pb-32">
        {/* Story Header */}
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
            {title}
          </h1>
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
}

function StoryLine({ node, index, onFork }: StoryLineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAlternatives = node.alternatives && node.alternatives.length > 0;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      className="relative pl-6 md:pl-16 group"
    >
      {/* Timeline dot */}
      <div className="absolute left-[-3px] md:left-[29px] top-2 w-2 h-2 rounded-full bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary transition-colors" />

      <div className="relative">
        {/* Badge for Alternatives - Moved to left */}
        {hasAlternatives && (
          <div className="absolute -left-12 md:-left-24 top-1.5 z-20" ref={containerRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                isOpen 
                  ? "bg-primary text-primary-foreground shadow-sm scale-105" 
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer border border-border/50"
              )}
            >
              <GitFork className="w-3 h-3" />
              <span>{node.alternatives!.length}</span>
            </button>

            {/* Popover */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute left-0 mt-2 w-72 md:w-80 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden origin-top-left"
                >
                   <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                      <span className="text-xs font-medium text-muted-foreground">Alternative paths</span>
                      <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                      </button>
                   </div>
                  <div className="p-2 space-y-1">
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

        <div className="relative inline-block w-full">
           <p className="text-lg md:text-xl leading-relaxed font-serif text-foreground/90 inline">
            {node.text}
          </p>
        </div>

        {/* Inline Fork Button (hidden by default, shown on group hover) */}
        {/* We keep this for the main line forking, or maybe suppress it if alternatives are open? 
            Let's keep it subtle at the bottom of the text block as before, but less intrusive.
        */}
        <div className="absolute -right-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
             <button
                onClick={() => onFork(node.id, index)}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
                title="Fork from this line"
              >
                <GitFork className="w-4 h-4" />
              </button>
        </div>
      </div>
    </motion.div>
  );
}
