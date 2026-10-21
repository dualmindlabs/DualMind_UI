import type { ReactNode } from 'react';

import { ApiProvider } from '@/components/layout/api-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Everything every page shares, mounted once in src/app/root.tsx: the API client and query
 * cache, Motion (lazy features, the token transition, reduced motion followed), tooltip timing,
 * the command palette (Ctrl+K or Cmd+K) and the toaster.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ApiProvider>
      <MotionProvider>
        <TooltipProvider>
          <CommandPaletteProvider>
            {children}
            <CommandPalette />
            <Toaster />
          </CommandPaletteProvider>
        </TooltipProvider>
      </MotionProvider>
    </ApiProvider>
  );
}
