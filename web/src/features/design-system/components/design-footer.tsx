import { Wordmark } from '@/components/layout/wordmark';

export function DesignFooter() {
  return (
    <footer className="border-t border-line bg-bg-deep">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="space-y-3">
          <Wordmark className="text-ui" />
          <p className="max-w-reading text-ui-sm text-muted">
            Design system v0.1. Every value on this page comes from{' '}
            <code className="text-caption text-fg-soft">web/src/styles/tokens.css</code>. The page
            is not indexed by search engines.
          </p>
        </div>
        <p className="eyebrow text-muted">Two minds, one verdict</p>
      </div>
    </footer>
  );
}
