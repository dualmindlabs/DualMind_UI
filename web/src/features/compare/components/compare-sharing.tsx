import { useMutation } from '@tanstack/react-query';
import { Check, Copy, Lock, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useApiClient } from '@/hooks/use-api-client';
import type { CompareResult } from '@/lib/api';
import { copyText } from '@/lib/utils/clipboard';

import { compareErrorMessage } from '../lib/errors';
import { compareUrl, formatDay } from '../lib/format';

export interface CompareSharingProps {
  result: CompareResult;
  /** Owner controls (share switch, delete) show for results this browser made. */
  owner: boolean;
  onDeleted: () => void;
}

/**
 * Who can read this result, said plainly, and for the owner the controls: the share switch, the
 * link and delete. The status line is always there so the privacy state is never a guess: private
 * (only you), or shared (anyone with the link), and when the stored result is removed. Every change
 * is announced in the live region; a failed change leaves the switch where it was.
 */
export function CompareSharing({ result, owner, onDeleted }: CompareSharingProps) {
  const api = useApiClient();
  const shareId = result.shareId;
  const [shared, setShared] = useState(result.shared);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setShared(result.shared), [result.shared]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const toggle = useMutation({
    mutationFn: (next: boolean) => {
      if (shareId === null) throw new Error('not stored');
      return api.setCompareShared(shareId, next);
    },
    onSuccess: state => {
      setShared(state.shared);
      setMessage(
        state.shared
          ? 'Sharing is on. Anyone with the link can read this result.'
          : 'Sharing is off. Only you can open this result.',
      );
    },
    onError: error => setMessage(`The change was not saved. ${compareErrorMessage(error)}`),
  });

  const remove = useMutation({
    mutationFn: () => {
      if (shareId === null) throw new Error('not stored');
      return api.deleteCompare(shareId);
    },
    onSuccess: onDeleted,
    onError: error => {
      setConfirming(false);
      setMessage(`Not deleted. ${compareErrorMessage(error)}`);
    },
  });

  const expires = formatDay(result.expiresAt);

  async function copyLink() {
    if (shareId === null) return;
    if (await copyText(compareUrl(shareId))) {
      setCopied(true);
      setMessage('Link copied.');
    } else {
      setMessage('The browser blocked the clipboard. Copy the address from the box instead.');
    }
  }

  const Icon = shared ? Users : Lock;

  return (
    <section
      aria-labelledby="compare-sharing-title"
      data-testid="compare-sharing"
      className="grid gap-5 surface-float p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-fg-soft"
        >
          <Icon className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="grid gap-1">
          <h2 id="compare-sharing-title" className="text-h3 text-fg">
            {shareId === null ? 'Not saved' : shared ? 'Shared by link' : 'Private'}
          </h2>
          <p data-testid="compare-privacy" className="text-ui text-fg-soft">
            {shareId === null
              ? 'This result could not be stored, so it cannot be shared or opened again. Copy what you need from it now.'
              : shared
                ? 'Anyone who has the link can read this result. They see the prompt and both answers, never your account.'
                : 'Only you can open this result, signed in. Nobody else can, even with the link.'}
            {shareId !== null && expires ? ` Kept until ${expires}, then deleted.` : ''}
          </p>
        </div>
      </div>

      {shareId !== null && owner ? (
        <div className="grid gap-4">
          <Field
            label="Anyone with the link can read this"
            layout="control-end"
            description="Turn it off at any time. The link stops working straight away."
          >
            {control => (
              <Switch
                {...control}
                checked={shared}
                disabled={toggle.isPending || remove.isPending}
                onCheckedChange={next => toggle.mutate(next)}
                data-testid="compare-result-share-switch"
              />
            )}
          </Field>

          {shared ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                aria-label="Share link"
                value={compareUrl(shareId)}
                onFocus={event => event.currentTarget.select()}
                className="h-9 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 font-mono text-caption text-fg-soft"
              />
              <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                {copied ? (
                  <Check aria-hidden="true" strokeWidth={1.75} />
                ) : (
                  <Copy aria-hidden="true" strokeWidth={1.75} />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {confirming ? (
              <>
                <span className="text-ui-sm text-fg-soft">
                  Delete this result and its link for good?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Delete for good
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => setConfirming(false)}
                >
                  Keep it
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                <Trash2 aria-hidden="true" strokeWidth={1.75} />
                Delete this result
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="min-h-5 text-ui-sm text-fg-soft">
        {message}
      </p>
    </section>
  );
}
