import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Lock,
  type LucideIcon,
  RotateCw,
  Share2,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, GroupField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { useApiClient } from '@/hooks/use-api-client';
import {
  FEATURE_FLAGS,
  featureFlagQuery,
  getUserMessage,
  setThreadVisibilityMutation,
  type Thread,
  type ThreadMode,
  threadQuery,
  type Visibility,
} from '@/lib/api';
import { sharePath, shareUrl } from '@/lib/site/share';
import { canShareNatively, copyText, shareNatively } from '@/lib/utils/clipboard';
import { cn } from '@/lib/utils/cn';

interface VisibilityOption {
  value: Visibility;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Said once the change is saved (polite live region). */
  saved: string;
}

export const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  {
    value: 'private',
    label: 'Private',
    icon: Lock,
    description: 'Only you. The link does not open for anyone else.',
    saved: 'Private: only you can open it now.',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    icon: Link2,
    description: 'Anyone with the link can open it. It is not listed or shown to search engines.',
    saved: 'Unlisted: anyone with the link can open it now.',
  },
  {
    value: 'public',
    label: 'Public',
    icon: Globe,
    description: 'Anyone can open it, and search engines may show it.',
    saved: 'Public: anyone can open it now.',
  },
];

const NOUNS: Record<ThreadMode, string> = {
  battle: 'battle',
  arena: 'comparison',
  direct: 'chat',
};

function VisibilitySkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <Skeleton key={index} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

function ShareForm({ thread }: { thread: Thread }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const linkId = useId();
  const change = useMutation(setThreadVisibilityMutation(api, queryClient));
  const flag = useQuery(featureFlagQuery(api, FEATURE_FLAGS.publicSharing));
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const pending = change.isPending ? (change.variables?.visibility ?? null) : null;
  const visibility = pending ?? thread.visibility;
  const open = visibility !== 'private';
  const url = shareUrl(thread.threadId);
  const noun = NOUNS[thread.mode];
  const native = { title: thread.title, text: `A ${noun} on DualMind Arena`, url };
  const nativeAvailable = canShareNatively(native);

  const select = (next: Visibility) => {
    if (next === thread.visibility || change.isPending) return;
    setSaved('');
    change.mutate(
      { threadId: thread.threadId, visibility: next },
      {
        onSuccess: () =>
          setSaved(VISIBILITY_OPTIONS.find(option => option.value === next)?.saved ?? ''),
        onError: failure =>
          toast.error('Could not change who can open it', {
            description: getUserMessage(failure),
          }),
      },
    );
  };

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      toast.success('Link copied', { description: url });
    } else {
      toast.error('Could not copy the link', {
        description: 'The browser blocked the clipboard. Select the link and copy it instead.',
      });
    }
  };

  const shareSheet = async () => {
    if ((await shareNatively(native)) === 'failed') {
      toast.error('Could not open the share sheet', { description: 'Copy the link instead.' });
    }
  };

  const CopyIcon = copied ? Check : Copy;

  return (
    <div className="grid gap-6">
      {flag.data?.enabled === false ? (
        <p
          role="note"
          className="flex gap-2.5 rounded-md border border-warn/50 bg-warn/10 px-3.5 py-3 text-ui-sm text-fg"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            Sharing is switched off on the server right now, so shared links only open for you. Your
            choice is kept for when it is back.
          </span>
        </p>
      ) : null}

      <GroupField label="Who can open it">
        {group => (
          <RadioGroup
            {...group}
            value={visibility}
            onValueChange={value => select(value as Visibility)}
            disabled={change.isPending}
            className="gap-2"
            data-testid="share-visibility"
          >
            {VISIBILITY_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <Field
                  key={option.value}
                  layout="control-start"
                  label={
                    <span className="inline-flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4 text-fg-soft" strokeWidth={1.75} />
                      {option.label}
                      {pending === option.value ? (
                        <span className="text-caption font-normal text-muted">Saving…</span>
                      ) : null}
                    </span>
                  }
                  description={option.description}
                  className={cn(
                    'rounded-lg border border-line bg-surface px-3.5 py-3 transition-colors duration-(--dur-fast) ease-out-expo',
                    'has-[[data-checked]]:border-mind-a/70 has-[[data-checked]]:bg-mind-a-tint',
                  )}
                >
                  {control => <RadioGroupItem {...control} value={option.value} />}
                </Field>
              );
            })}
          </RadioGroup>
        )}
      </GroupField>
      <p role="status" className="sr-only">
        {saved}
      </p>

      <div className="grid gap-2">
        <label htmlFor={linkId} className="text-ui-sm font-medium text-fg">
          Link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={linkId}
            readOnly
            value={url}
            disabled={!open}
            aria-describedby={`${linkId}-help`}
            onFocus={event => event.currentTarget.select()}
            className="font-mono text-ui-sm sm:text-ui-sm"
            data-testid="share-link"
          />
          <Button
            variant="primary"
            onClick={() => void copy()}
            disabled={!open}
            className="shrink-0"
          >
            <CopyIcon aria-hidden="true" strokeWidth={1.75} />
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <p id={`${linkId}-help`} className="text-caption text-muted">
          {open
            ? 'People with the link see the prompts and answers, and the model names and verdict where you voted. Never your name or email.'
            : 'Choose Unlisted or Public to turn the link on.'}
        </p>
      </div>

      {open ? (
        <DialogFooter className="sm:justify-between">
          <a
            href={sharePath(thread.threadId)}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ExternalLink aria-hidden="true" strokeWidth={1.75} />
            Open the page
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          {nativeAvailable ? (
            <Button variant="secondary" size="sm" onClick={() => void shareSheet()}>
              <Share2 aria-hidden="true" strokeWidth={1.75} />
              Share…
            </Button>
          ) : null}
        </DialogFooter>
      ) : null}
    </div>
  );
}

export interface ShareDialogProps {
  /** The thread to share; null keeps the dialog closed. */
  threadId: string | null;
  onClose: () => void;
}

/**
 * Share a thread (slice S11): who can open it (Private, Unlisted, Public, saved at once through
 * `PATCH /api/threads/{id}/visibility`), the link with copy, the system share sheet where the
 * browser has one, and a way to open the page. Opened from the thread header, the history menu
 * and the command palette.
 */
export function ShareDialog({ threadId, onClose }: ShareDialogProps) {
  const api = useApiClient();
  const thread = useQuery({
    ...threadQuery(api, threadId ?? ''),
    enabled: threadId !== null,
  });
  const data = thread.data?.threadId === threadId ? thread.data : undefined;
  const noun = data ? NOUNS[data.mode] : 'thread';

  return (
    <Dialog open={threadId !== null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent className="max-w-lg" data-testid="share-dialog">
        <DialogHeader>
          <DialogTitle>Share this {noun}</DialogTitle>
          <DialogDescription>
            {data ? `“${data.title}”. ` : null}Choose who can open it, then copy the link.
          </DialogDescription>
        </DialogHeader>
        {data ? (
          <ShareForm key={data.threadId} thread={data} />
        ) : thread.isError ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="text-ui-sm text-fg-soft">{getUserMessage(thread.error)}</p>
            <Button variant="secondary" size="sm" onClick={() => void thread.refetch()}>
              <RotateCw aria-hidden="true" strokeWidth={1.75} />
              Try again
            </Button>
          </div>
        ) : (
          <div aria-busy="true">
            <p className="sr-only">Loading the sharing settings</p>
            <VisibilitySkeleton />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
