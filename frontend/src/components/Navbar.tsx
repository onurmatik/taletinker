/**
 * Unified Navigation Bar component.
 * Handles branding, authentication state, and global navigation actions.
 */
import { LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '../utils';

interface NavbarProps {
  logoUrl?: string;
  isLoggedIn: boolean;
  userEmail?: string | null;
  onSignIn: () => void;
  onLogout: () => void;
  onHome?: () => void;
  className?: string;
  leftAction?: React.ReactNode; // For things like "Back" buttons
}

export function Navbar({ 
  logoUrl = "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/96f11572-3efa-493f-af56-46d0e7e061a6/1765783798102-dea49690/logo.png",
  isLoggedIn,
  userEmail,
  onSignIn,
  onLogout,
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
                className="w-8 h-8 object-contain transition-transform group-hover:scale-105" 
              />
            )}
            <span className="font-serif font-bold text-xl tracking-tight group-hover:text-primary transition-colors text-foreground">
              TaleTinker
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Signed in as</span>
              <span className="text-sm font-medium text-foreground max-w-[150px] truncate">
                {userEmail || 'User'}
              </span>
            </div>
            
            <div className="h-8 w-px bg-border hidden md:block" />
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            
            {/* Mobile Avatar / Placeholder */}
            <div className="md:hidden w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <UserIcon className="w-4 h-4" />
            </div>
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
