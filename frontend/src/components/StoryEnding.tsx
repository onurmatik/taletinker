/**
 * Component to display the story ending.
 * Allows editing title, signing up to save, and restarting.
 */
import { motion } from 'framer-motion';
import { RotateCcw, BookOpen, Pencil, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { cn } from '../utils';

interface StoryEndingProps {
  text: string;
  storyTitle: string;
  setStoryTitle: (title: string) => void;
  isLoggedIn: boolean;
  onRestart: () => void;
  onSignUp: () => void;
}

export function StoryEnding({ 
  text, 
  storyTitle, 
  setStoryTitle, 
  isLoggedIn, 
  onRestart, 
  onSignUp 
}: StoryEndingProps) {
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
      <div className="space-y-4">
        <div className="uppercase tracking-widest text-xs font-semibold text-muted-foreground">
          The End
        </div>
        <div className="relative group inline-block max-w-full">
          <input
            type="text"
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="text-3xl md:text-5xl font-serif font-bold text-center bg-transparent border-none focus:ring-0 p-0 text-foreground w-full min-w-[200px] placeholder:text-muted-foreground/50 truncate"
            placeholder="Untitled Story"
          />
          <Pencil className="w-4 h-4 text-muted-foreground absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      {/* Ending Text */}
      <div className="relative">
        <span className="absolute -top-4 -left-2 text-6xl text-primary/10 font-serif">"</span>
        <p className="text-lg md:text-xl text-muted-foreground font-serif leading-relaxed italic px-8">
          {text}
        </p>
        <span className="absolute -bottom-8 -right-2 text-6xl text-primary/10 font-serif leading-none">"</span>
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 mt-12">
        {/* Guest Incentive Card */}
        {!isLoggedIn && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg relative overflow-hidden text-left"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="p-3 bg-secondary rounded-xl text-secondary-foreground">
                <Lock className="w-6 h-6" />
              </div>
              
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-lg">Don't lose your story</h3>
                <p className="text-muted-foreground text-sm">
                  This story is saved in our database. Sign up to claim 
                  <span className="font-medium text-foreground italic"> "{storyTitle}" </span>
                  and add it to your library.
                </p>
              </div>

              <button
                onClick={onSignUp}
                className={cn(
                  "whitespace-nowrap inline-flex items-center gap-2 px-5 py-2.5 rounded-full",
                  "bg-primary text-primary-foreground font-medium text-sm",
                  "hover:bg-primary/90 transition-all shadow-md hover:shadow-lg",
                  "w-full md:w-auto justify-center"
                )}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up to Save
              </button>
            </div>
          </motion.div>
        )}

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
