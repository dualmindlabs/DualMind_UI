import { CircleAlert, CircleCheck } from 'lucide-react';

/**
 * The form's announcements. Two live regions that are always in the page (a region added at the
 * same time as its text is often not read): `role="alert"` for a failure, `role="status"` for
 * progress and success ("Sending your code", "Code sent"). Empty regions take no space; show one
 * message at a time.
 */
export function FormStatus({
  error,
  status,
  className,
}: {
  error: string | null;
  status: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div role="alert">
        {error ? (
          <p className="flex items-start gap-2 rounded-md border border-bad/40 bg-bad/10 px-3.5 py-3 text-ui-sm text-fg">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-bad" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
      <div role="status">
        {status ? (
          <p className="flex items-start gap-2 rounded-md border border-ok/40 bg-ok/10 px-3.5 py-3 text-ui-sm text-fg">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
            <span>{status}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
