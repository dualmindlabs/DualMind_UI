import {
  ArrowRight,
  BookOpen,
  Boxes,
  CircleQuestionMark,
  Code,
  ExternalLink,
  Info,
  type LucideIcon,
  Mail,
  Monitor,
  Moon,
  Settings,
  Sun,
  Swords,
  Trophy,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/hooks/use-auth';
import { type CommandAction, useCommandPalette } from '@/hooks/use-command-palette';
import { useTheme } from '@/hooks/use-theme';
import { blockOfflineNavigation } from '@/lib/network/online-status';
import { GITHUB_URL, primaryNav, settingsLink, SUPPORT_EMAIL } from '@/lib/site/links';
import type { ThemePreference } from '@/lib/theme/theme';

const navIcons: Record<string, LucideIcon> = {
  '/': Swords,
  '/leaderboard/': Trophy,
  '/models/': Boxes,
  '/how-it-works/': BookOpen,
};

const navKeywords: Record<string, readonly string[]> = {
  '/': ['battle', 'compare', 'chat', 'new', 'home'],
  '/leaderboard/': ['ranking', 'elo', 'scores', 'top'],
  '/models/': ['llm', 'ai', 'catalog'],
  '/how-it-works/': ['help', 'rules', 'voting', 'elo'],
};

/** An icon in a small recessed tile: the palette's one repeated motif. */
function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-bg-deep group-data-[selected=true]/item:border-mind-a-edge"
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** Legacy pages are not React routes yet, so navigation is a full page load. */
function goTo(href: string) {
  // Offline, where the screen says so (the arena), stay on the page instead of the browser's.
  if (blockOfflineNavigation()) return;
  window.location.assign(href);
}

const descriptions: Record<string, string> = Object.fromEntries(
  primaryNav.flatMap(link => (link.description ? [[`go-${link.href}`, link.description]] : [])),
);

const themeActions: ReadonlyArray<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: 'system', label: 'Use the system theme', icon: Monitor },
  { value: 'dark', label: 'Use the dark theme', icon: Moon },
  { value: 'light', label: 'Use the light theme', icon: Sun },
];

/**
 * The command palette (Ctrl+K or Cmd+K): jump to a page (Settings too, when signed in), switch
 * the theme, and run the commands features add with useCommandPaletteGroup() (the arena's
 * "New battle", "Switch mode" in S8).
 * A modal dialog: focus moves to the search field, Esc closes it and focus returns to where it was.
 */
export function CommandPalette() {
  const { open, setOpen, groups } = useCommandPalette();
  const { preference, setPreference } = useTheme();
  const signedIn = useAuth().status === 'signed-in';

  const navigate = useMemo<readonly CommandAction[]>(
    () => [
      ...primaryNav.map(link => {
        const action: CommandAction = {
          id: `go-${link.href}`,
          label: link.label,
          keywords: navKeywords[link.href] ?? [],
          icon: navIcons[link.href] ?? ArrowRight,
          hint: link.href,
          perform: () => goTo(link.href),
        };
        return action;
      }),
      {
        id: 'go-/faq/',
        label: 'FAQ',
        keywords: ['questions', 'help', 'support'],
        icon: CircleQuestionMark,
        hint: '/faq/',
        perform: () => goTo('/faq/'),
      },
      {
        id: 'go-/about/',
        label: 'About',
        keywords: ['team', 'story', 'company'],
        icon: Info,
        hint: '/about/',
        perform: () => goTo('/about/'),
      },
      {
        id: 'go-/developers/',
        label: 'API',
        keywords: ['developers', 'docs', 'integrate', 'keys'],
        icon: Code,
        hint: '/developers/',
        perform: () => goTo('/developers/'),
      },
      ...(signedIn
        ? [
            {
              id: `go-${settingsLink.href}`,
              label: settingsLink.label,
              keywords: [
                'account',
                'profile',
                'preferences',
                'password',
                'export',
                'download',
                'motion',
                'shortcuts',
              ],
              icon: Settings,
              hint: settingsLink.href,
              perform: () => goTo(settingsLink.href),
            },
          ]
        : []),
    ],
    [signedIn],
  );

  const run = (perform: () => void) => {
    setOpen(false);
    perform();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search for a page or a command, then press Enter."
    >
      <Command label="Commands" loop>
        <CommandInput placeholder="Search pages and commands" />
        <CommandList>
          <CommandEmpty>No matches. Try “leaderboard” or “theme”.</CommandEmpty>
          <CommandGroup heading="Go to">
            {navigate.map(action => {
              const Icon = action.icon ?? ArrowRight;
              return (
                <CommandItem
                  key={action.id}
                  value={action.label}
                  keywords={[...(action.keywords ?? [])]}
                  onSelect={() => run(action.perform)}
                  className="group/item"
                >
                  <IconTile icon={Icon} />
                  {action.label}
                  {descriptions[action.id] ? (
                    <span
                      aria-hidden="true"
                      className="truncate text-caption text-muted max-sm:hidden"
                    >
                      {descriptions[action.id]}
                    </span>
                  ) : null}
                  {action.hint ? (
                    <CommandShortcut className="font-mono">{action.hint}</CommandShortcut>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Theme">
            {themeActions.map(({ value, label, icon: Icon }) => (
              <CommandItem
                key={value}
                value={label}
                keywords={['theme', 'appearance', 'mode', value]}
                onSelect={() => run(() => setPreference(value))}
                className="group/item"
              >
                <IconTile icon={Icon} />
                {label}
                {preference === value ? <CommandShortcut>Current</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Elsewhere">
            <CommandItem
              value="GitHub"
              keywords={['source', 'code', 'repo', 'open source']}
              onSelect={() => run(() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer'))}
              className="group/item"
            >
              <IconTile icon={ExternalLink} />
              GitHub
              <CommandShortcut>Opens a new tab</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="Contact support"
              keywords={['email', 'help', 'mail', 'feedback']}
              onSelect={() => run(() => goTo(`mailto:${SUPPORT_EMAIL}`))}
              className="group/item"
            >
              <IconTile icon={Mail} />
              Contact support
              <CommandShortcut>{SUPPORT_EMAIL}</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          {groups.map(group => (
            <CommandGroup key={group.id} heading={group.heading}>
              {group.actions.map(action => {
                const Icon = action.icon ?? ArrowRight;
                return (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    keywords={[...(action.keywords ?? [])]}
                    onSelect={() => run(action.perform)}
                    className="group/item"
                  >
                    <IconTile icon={Icon} />
                    {action.label}
                    {action.hint ? <CommandShortcut>{action.hint}</CommandShortcut> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <div
          aria-hidden="true"
          className="hidden shrink-0 items-center gap-4 border-t border-line px-4 py-2.5 text-caption text-muted sm:flex"
        >
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> to open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
