import type { ReactNode } from 'react';

import { CommandPalette } from '@/components/layout/command-palette';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Everything every page shares, mounted once in src/app/root.tsx: tooltip timing, the command
 * palette (Ctrl+K or Cmd+K) and the toaster.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <CommandPaletteProvider>
        {children}
        <CommandPalette />
        <Toaster />
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}
