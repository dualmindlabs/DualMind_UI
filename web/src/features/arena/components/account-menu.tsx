import { LogOut, Settings, Undo2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { settingsLink } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

import { leaveForClassicArena } from '../lib/classic-arena';

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'Y';
}

/**
 * The signed-in visitor's menu: who is signed in, settings, the classic arena, and sign out. The
 * name set on /settings/ (Supabase `full_name`) comes first, then the API profile's.
 */
export function AccountMenu() {
  const { user, profile, signOut } = useAuth();
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof metadata.full_name === 'string' && metadata.full_name.trim() !== ''
      ? metadata.full_name.trim()
      : null;
  const name = fullName ?? profile?.name ?? user?.email ?? 'You';
  const email = user?.email ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account: ${name}`}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'rounded-full border border-human/50 bg-human-tint font-medium text-human hover:bg-human-tint',
        )}
      >
        <span aria-hidden="true">{initialOf(name)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5 normal-case">
            <span className="text-ui-sm font-medium tracking-normal text-fg">{name}</span>
            {email && email !== name ? (
              <span className="font-sans text-caption tracking-normal text-muted">{email}</span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem href={settingsLink.href}>
          <Settings aria-hidden="true" strokeWidth={1.75} />
          {settingsLink.label}
        </DropdownMenuLinkItem>
        <DropdownMenuItem onClick={leaveForClassicArena}>
          <Undo2 aria-hidden="true" strokeWidth={1.75} />
          Open the classic arena
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut aria-hidden="true" strokeWidth={1.75} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
