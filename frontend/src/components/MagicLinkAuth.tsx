/**
 * MagicLinkAuth Component
 * A standalone authentication card for email-only login flows.
 * - Matches the visual style of the reference image
 * - Handles loading states
 * - Provides props for callback customization
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '../utils';

export interface MagicLinkAuthProps {
  /** Callback when user submits email */
  onSubmit: (email: string) => Promise<void> | void;
  /** Optional predefined email */
  defaultEmail?: string;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Custom footer text override */
  footerText?: React.ReactNode;
  /** ClassName for custom styling */
  className?: string;
}

export function MagicLinkAuth({
  onSubmit,
  defaultEmail = '',
  title = "Sign in",
  description = "Enter your email to continue. We'll send you a secure login link.",
  footerText,
  className
}: MagicLinkAuthProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setStatus('loading');

    try {
      await onSubmit(email);
      setStatus('success');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-background w-full max-w-[440px] rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden mx-auto",
          className
        )}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-10 -mt-10" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6 py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Check your inbox</h2>
          <p className="text-muted-foreground text-lg">
            We've sent a magic login link to <br/>
            <span className="font-semibold text-foreground">{email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Didn't receive it? <button onClick={() => setStatus('idle')} className="text-primary hover:underline font-medium">Try again</button>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-background w-full max-w-[440px] rounded-[2rem] p-8 md:p-10 shadow-xl border border-border/50 relative overflow-hidden mx-auto",
        className
      )}
    >
      {/* Decorative Top Right Corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/30 rounded-bl-full pointer-events-none" />
      
      <div className="relative z-10">
        <h2 className="text-4xl font-bold tracking-tight text-foreground mb-3 font-sans">
          {title}
        </h2>
        
        <p className="text-muted-foreground text-lg leading-relaxed mb-10">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label 
              htmlFor="email" 
              className="text-xs font-bold text-muted-foreground tracking-wider uppercase pl-1"
            >
              Email
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                className={cn(
                  "w-full bg-secondary/20 hover:bg-secondary/30 focus:bg-background transition-colors",
                  "border border-border/50 focus:border-primary/50",
                  "rounded-xl py-4 pl-12 pr-4 outline-none",
                  "text-lg text-foreground placeholder:text-muted-foreground/40",
                  "focus:ring-4 focus:ring-primary/5",
                  error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/5"
                )}
                autoComplete="email"
                autoFocus
              />
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive pl-1"
              >
                {error}
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className={cn(
              "w-full bg-foreground text-background font-medium text-lg",
              "rounded-xl py-4 px-6",
              "flex items-center justify-center gap-2",
              "hover:opacity-90 active:scale-[0.99] transition-all",
              "shadow-lg hover:shadow-xl",
              "disabled:opacity-70 disabled:cursor-not-allowed"
            )}
          >
            {status === 'loading' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Continue with Email
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground/60 leading-relaxed px-4">
            {footerText || (
              <>
                By clicking continue, you agree to our{' '}
                <a href="#" className="hover:text-foreground transition-colors underline decoration-muted-foreground/30">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="hover:text-foreground transition-colors underline decoration-muted-foreground/30">Privacy Policy</a>.
                {' '}
                <a
                  href="https://featurerequest.io/onurmatik/tale-tinker/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors underline decoration-muted-foreground/30"
                >
                  Suggest a Feature or Report a Bug
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Default export for generic import usage
export default MagicLinkAuth;
