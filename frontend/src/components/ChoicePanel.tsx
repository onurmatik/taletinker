/**
 * Component for presenting user choices and handling the timer.
 * Includes 2 AI suggestions and 1 custom input.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock, Sparkles, PenTool, PauseCircle, RefreshCw } from 'lucide-react';
import { Choice } from '../types';
import { cn } from '../utils';

interface ChoicePanelProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  onRefresh?: () => void;
  timeoutSeconds: number;
  disabled?: boolean;
}

export function ChoicePanel({ suggestions, onSelect, onRefresh, timeoutSeconds, disabled = false }: ChoicePanelProps) {
  const [customInput, setCustomInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Reset timer when suggestions change (new turn)
  useEffect(() => {
    setTimeLeft(timeoutSeconds);
    setIsPaused(false);
  }, [suggestions, timeoutSeconds]);

  // Timer logic
  useEffect(() => {
    if (disabled || isPaused) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          // Auto-select first suggestion if time runs out
          if (suggestions.length > 0) {
            onSelect(suggestions[0]);
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [suggestions, onSelect, disabled, isPaused]);

  // Handle custom submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelect(customInput.trim());
      setCustomInput('');
    }
  };

  const progressPercentage = (timeLeft / timeoutSeconds) * 100;
  const isUrgent = progressPercentage < 30;

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden mt-8">
      {/* Timer Bar */}
      <div className="h-1.5 w-full bg-secondary">
        <motion.div 
          className={cn(
            "h-full origin-left",
            isUrgent ? "bg-destructive" : "bg-primary",
            isPaused && "opacity-50"
          )}
          initial={{ width: "100%" }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            What happens next?
          </h3>
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-mono font-medium transition-colors",
            isPaused ? "text-primary" : (isUrgent ? "text-destructive" : "text-muted-foreground")
          )}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors mr-2"
                title="Refresh options"
                disabled={disabled}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {isPaused ? (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                PAUSED
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                {Math.ceil(timeLeft)}s
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {/* AI Suggestions */}
          {suggestions.map((text, idx) => {
             const isEndOption = text === "The End";
             
             if (isEndOption) {
               return (
                 <motion.button
                   key={idx}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   onClick={() => onSelect(text)}
                   disabled={disabled}
                   className="group text-left p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
                 >
                   <Sparkles className="w-4 h-4 text-primary" />
                   <span className="text-primary font-medium font-serif italic">
                     The End.
                   </span>
                   <Sparkles className="w-4 h-4 text-primary" />
                 </motion.button>
               );
             }

             return (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onSelect(text)}
                disabled={disabled}
                className="group text-left p-4 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all duration-200 flex items-start gap-3"
              >
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-muted-foreground/30 group-hover:border-primary group-hover:text-primary flex items-center justify-center text-[10px] text-muted-foreground transition-colors">
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-foreground/90 font-serif leading-relaxed group-hover:text-primary transition-colors">
                  {text}
                </span>
              </motion.button>
            );
          })}

          {/* Custom Input */}
          <motion.form 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleCustomSubmit} 
            className="relative"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <PenTool className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              placeholder="Write your own continuation or type 'The End' to end the story"
              className={cn(
                "w-full pl-10 pr-12 py-3.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif",
                isPaused ? "border-primary ring-2 ring-primary/10" : "border-border"
              )}
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={!customInput.trim() || disabled}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}