import type { ReactNode } from 'react';

import { ApiProvider } from '@/components/layout/api-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { DeferredCommandPalette } from '@/components/layout/deferred-command-palette';
import { DeferredToaster } from '@/components/layout/deferred-toaster';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Everything every page shares, mounted once in src/app/root.tsx: the API client and query
 * cache, Motion (lazy features, the token transition, reduced motion followed), tooltip timing,
 * the command palette (Ctrl+K or Cmd+K) and the toaster. The palette and the toaster load their
 * code after hydration, so pages do not load them up front (docs/redesign/migration-plan.md,
 * section 7: the JavaScript budget of marketing pages).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ApiProvider>
      <MotionProvider>
        <TooltipProvider>
          <CommandPaletteProvider>
            {children}
            <DeferredCommandPalette />
            <DeferredToaster />
          </CommandPaletteProvider>
        </TooltipProvider>
      </MotionProvider>
    </ApiProvider>
  );
}
