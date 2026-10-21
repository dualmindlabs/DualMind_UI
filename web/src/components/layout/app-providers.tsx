import type { ReactNode } from 'react';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { DeferredCommandPalette } from '@/components/layout/deferred-command-palette';
import { DeferredToaster } from '@/components/layout/deferred-toaster';
import { MotionProvider } from '@/components/motion/motion-provider';

/**
 * Everything every page shares, mounted once in src/app/root.tsx: the API client and query
 * cache, the auth state (useAuth(); supabase-js loads only when someone is signed in), Motion (lazy features, the token transition, reduced motion followed), 
 * the command palette (Ctrl+K or Cmd+K) and the toaster. The tooltip library is not mounted here (wrap the screen that uses tooltips in
 * <TooltipProvider>, so pages without tooltips do not load it). The palette and the toaster load their
 * code after hydration, so pages do not load them up front (docs/redesign/migration-plan.md,
 * section 7: the JavaScript budget of marketing pages).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ApiProvider>
      <AuthProvider>
        <MotionProvider>
          <CommandPaletteProvider>
            {children}
            <DeferredCommandPalette />
            <DeferredToaster />
          </CommandPaletteProvider>
        </MotionProvider>
      </AuthProvider>
    </ApiProvider>
  );
}
