import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { AppProviders } from '@/components/layout/app-providers';

/** Renders UI the way the root does: inside a router and the app's providers. */
export function renderWithShell(ui: ReactElement, path = '/design/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>{ui}</AppProviders>
    </MemoryRouter>,
  );
}
