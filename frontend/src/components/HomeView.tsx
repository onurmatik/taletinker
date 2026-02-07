/**
 * Home view for TaleTinker.
 * Displays a list of stories to read and an option to start a new one.
 * NOW WITH: Instant Creator Hero Section
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Clock, ChevronRight, Sparkles, PenTool, ArrowRight, User, Heart } from 'lucide-react';
import { cn } from '../utils';

interface StorySummary {
  id: string;
  title: string;
  preview: string;
  date: string;
  length: number;
  authorName?: string | null;
  likeCount?: number;
}

interface HomeViewProps {
  stories: StorySummary[];
  onStartNew: (text?: string) => void;
  onSelectStory: (id: string) => void;
  starterPrompts: string[];
}

export function HomeView({ stories, onStartNew, onSelectStory, starterPrompts }: HomeViewProps) {
  const [customPrompt, setCustomPrompt] = useState('');

  const handleCustomStart = () => {
    if (customPrompt.trim()) {
      onStartNew(customPrompt);
    } else {
      onStartNew(); // Default start if empty (though UI might prevent this)
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomStart();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pt-16">
      {/* CREATOR HERO SECTION */}
      <section className="relative px-6 py-12 md:py-20 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl rounded-full pointer-events-none -z-10" />
        
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide mb-4">
            <Sparkles className="w-3 h-3" />
            AI Story Creator
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">
            What story will you <span className="text-primary italic">weave</span> today?
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Begin with a single sentence, and let TaleTinker guide you through an endless journey of imagination.
          </p>
        </motion.div>

        {/* Custom Input Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Once upon a time, in a land far away..."
              className="w-full p-6 text-lg md:text-xl bg-transparent border-none outline-none resize-none min-h-[120px] placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between px-4 pb-4 bg-muted/30 border-t border-border/50 pt-3">
               <span className="text-xs text-muted-foreground font-medium pl-2">
                 {customPrompt.length > 0 ? `${customPrompt.length} chars` : 'Type your opening...'}
               </span>
               <button 
                 onClick={handleCustomStart}
                 disabled={!customPrompt.trim()}
                 className={cn(
                   "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-300",
                   customPrompt.trim() 
                    ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                 )}
               >
                 <PenTool className="w-4 h-4" />
                 Weave Tale
               </button>
            </div>
          </div>
        </motion.div>

        {/* Spark Cards */}
        <div className="mt-12 w-full max-w-3xl">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px bg-border w-12" />
            <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Or start with a spark</span>
            <div className="h-px bg-border w-12" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {starterPrompts.map((prompt, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (index * 0.1) }}
                onClick={() => onStartNew(prompt)}
                className="group relative p-5 rounded-xl border border-border bg-card/50 hover:bg-card text-left hover:border-primary/30 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 text-primary/20 group-hover:text-primary transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-foreground/90 font-medium leading-relaxed pr-6">
                  "{prompt}"
                </p>
                <div className="mt-4 flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  Begin Story <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </motion.button>
            ))}
            
             {/* Surprise Me Option - Triggers empty startNew to get selection UI */}
             <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => onStartNew()} 
                className="md:col-span-2 p-3 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <span className="border-b border-dashed border-muted-foreground/50 hover:border-primary">I'm feeling lucky, show me more options</span>
              </motion.button>
          </div>
        </div>
      </section>

      {/* Library Section - Pushed down */}
      <main className="px-6 max-w-3xl mx-auto pb-20 border-t border-border pt-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Journeys
            </h3>
            {/* View All / Filter could go here */}
          </div>
          
          <div className="grid gap-4">
            {stories.length > 0 ? (
              stories.map((story) => (
                <motion.button
                  key={story.id}
                  onClick={() => onSelectStory(story.id)}
                  whileHover={{ scale: 1.005 }}
                  className="group flex items-start gap-5 p-5 rounded-2xl border border-border bg-card hover:bg-accent/5 hover:border-accent/20 transition-all text-left shadow-sm hover:shadow-md"
                >
                  <div className="w-14 h-14 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                      {story.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                      {story.preview}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground/70 font-medium">
                      <span className="bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">{story.date}</span>
                      <span>•</span>
                      <span>{story.length} lines</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {story.authorName || 'Anonymous'}
                      </span>
                      {Number(story.likeCount ?? 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5" />
                            {story.likeCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="self-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/5">
                <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">No stories in your library yet.</p>
                <p className="text-sm text-muted-foreground/50 mt-1">Start writing above!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
