/**
 * Component to render a single story sentence/node.
 * Handles the entry animation and styling.
 */
import { motion } from 'framer-motion';
import { StoryNode as StoryNodeType } from '../types';
import { cn } from '../utils';

interface StoryNodeProps {
  node: StoryNodeType;
  index: number;
  isLast: boolean;
  onBranch: () => void; // Function to handle "forking" from this point
}

export function StoryNode({ node, index, isLast, onBranch }: StoryNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      className="group relative mb-6 md:mb-8"
    >
      <div className="relative z-10">
        <p className={cn(
          "font-serif leading-relaxed text-foreground transition-colors duration-300",
          isLast ? "text-xl md:text-2xl font-medium" : "text-lg md:text-xl text-foreground/80"
        )}>
          {node.text}
        </p>
        
        {/* Branching indicator - appears on hover */}
        {!isLast && (
          <button
            onClick={onBranch}
            className="absolute -left-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-primary"
            title="Fork story from here"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v12" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
