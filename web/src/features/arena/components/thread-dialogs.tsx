import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useApiClient } from '@/hooks/use-api-client';
import { deleteThreadMutation, getUserMessage, renameThreadMutation, type Thread } from '@/lib/api';

const TITLE_MAX = 80;

export interface ThreadDialogsProps {
  renaming: Thread | null;
  deleting: Thread | null;
  onClose: () => void;
  /** Called after a delete succeeded (the arena leaves a thread that is gone). */
  onDeleted: (threadId: string) => void;
}

function RenameForm({ thread, onDone }: { thread: Thread; onDone: () => void }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const rename = useMutation(renameThreadMutation(api, queryClient));
  const [title, setTitle] = useState(thread.title);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = title.replace(/\s+/g, ' ').trim();
    if (next === '') {
      setError('Give the thread a title.');
      return;
    }
    if (next === thread.title) {
      onDone();
      return;
    }
    rename.mutate(
      { threadId: thread.threadId, title: next.slice(0, TITLE_MAX) },
      {
        onSuccess: () => {
          toast.success('Thread renamed');
          onDone();
        },
        onError: failure => setError(getUserMessage(failure)),
      },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <Field label="Title" error={error ?? undefined}>
        {control => (
          <Input
            {...control}
            value={title}
            maxLength={TITLE_MAX}
            autoComplete="off"
            onChange={event => {
              setTitle(event.target.value);
              setError(null);
            }}
          />
        )}
      </Field>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={rename.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Rename (a title field) and delete (a confirmation) for one thread at a time. */
export function ThreadDialogs({ renaming, deleting, onClose, onDeleted }: ThreadDialogsProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const remove = useMutation(deleteThreadMutation(api, queryClient));

  const confirmDelete = () => {
    if (!deleting) return;
    const { threadId } = deleting;
    remove.mutate(threadId, {
      onSuccess: () => {
        toast.success('Thread deleted');
        onDeleted(threadId);
        onClose();
      },
      onError: failure =>
        toast.error('Could not delete the thread', { description: getUserMessage(failure) }),
    });
  };

  return (
    <>
      <Dialog open={renaming !== null} onOpenChange={open => (open ? undefined : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename thread</DialogTitle>
            <DialogDescription>The new title shows in your history.</DialogDescription>
          </DialogHeader>
          {renaming ? <RenameForm key={renaming.threadId} thread={renaming} onDone={onClose} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={open => (open ? undefined : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this thread?</DialogTitle>
            <DialogDescription>
              {deleting ? `“${deleting.title}”` : 'The thread'} and its answers are removed for good.
              Votes you cast stay counted on the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={remove.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
