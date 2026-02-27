/**
 * Unified Navigation Bar component.
 * Handles branding, authentication state, and global navigation actions.
 */
import { LifeBuoy, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '../utils';

interface NavbarProps {
  logoUrl?: string;
  isLoggedIn: boolean;
  userEmail?: string | null;
  onSignIn: () => void;
  onLogout: () => void;
  onProfile?: () => void;
  onHome?: () => void;
  className?: string;
  leftAction?: React.ReactNode; // For things like "Back" buttons
}

export function Navbar({ 
  logoUrl = "/images/logo.png",
  isLoggedIn,
  userEmail,
  onSignIn,
  onLogout,
  onProfile,
  onHome,
  className,
  leftAction
}: NavbarProps) {
  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 h-16 px-4 backdrop-blur-md border-b border-blue-100 flex items-center justify-between transition-all bg-background/80",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Left Action (e.g. Back button) takes precedence if provided, otherwise Logo/Home */}
        {leftAction ? (
          leftAction
        ) : (
          <button 
            onClick={onHome}
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="Go to Home"
          >
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="TaleTinker Logo" 
                className="h-10 object-contain transition-transform group-hover:scale-105"
              />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://featurerequest.io/onurmatik/tale-tinker/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suggest a Feature or Report a Bug"
          title="Suggest a Feature or Report a Bug"
          className="group relative flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <LifeBuoy className="w-4 h-4" />
          <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 dark:bg-slate-800 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-visible:opacity-100 group-focus-visible:visible transition-all">
            Suggest a Feature or Report a Bug
          </span>
        </a>

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Signed in as</span>
              <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
                {userEmail || 'User'}
              </span>
            </div>
            
            <div className="h-8 w-px bg-border hidden md:block" />

            {onProfile && (
              <button
                onClick={onProfile}
                className="flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                title="Edit display name"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
