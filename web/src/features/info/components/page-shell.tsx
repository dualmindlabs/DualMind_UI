import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';

/** Skip link, header, `<main id="main">` and footer: the frame of every info, legal and 404 page. */
export function PageShell({
  children,
  overlay = false,
}: {
  children: ReactNode;
  overlay?: boolean;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader overlay={overlay} className="print:hidden" />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  );
}
