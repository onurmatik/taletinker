/**
 * Home view for TaleTinker.
 * Displays a list of stories to read and an option to start a new one.
 */
import { motion } from 'framer-motion';
import { Plus, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../utils';

interface StorySummary {
  id: string;
  title: string;
  preview: string;
  date: string;
  length: number;
}

interface HomeViewProps {
  stories: StorySummary[];
  onStartNew: () => void;
  onSelectStory: (id: string) => void;
}

export function HomeView({ stories, onStartNew, onSelectStory }: HomeViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans pt-16">
      {/* Header - Simplified as Navbar now handles branding */}
      <header className="px-6 py-8 md:py-12 max-w-3xl mx-auto text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
          Welcome to TaleTinker
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
          Weave your own path through endless narratives. Read existing tales or spark a new journey.
        </p>
      </header>

      {/* Main Actions */}
      <main className="px-6 max-w-3xl mx-auto pb-20">
        <div className="grid gap-8">
          
          {/* Create New Card */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onStartNew}
            className="group relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-left shadow-lg transition-all hover:shadow-xl hover:bg-primary/90"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary-foreground mb-2">
                  Start a New Story
                </h2>
                <p className="text-primary-foreground/80 max-w-sm">
                  Begin with a spark of inspiration and let the AI guide your imagination.
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 rounded-full bg-black/10 blur-2xl" />
          </motion.button>

          {/* Library Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Stories
            </h3>
            
            <div className="grid gap-4">
              {stories.length > 0 ? (
                stories.map((story) => (
                  <motion.button
                    key={story.id}
                    onClick={() => onSelectStory(story.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/5 hover:border-accent/20 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                        {story.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {story.preview}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/70">
                        <span>{story.date}</span>
                        <span>•</span>
                        <span>{story.length} lines</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all self-center" />
                  </motion.button>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <p className="text-muted-foreground">No stories saved yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
