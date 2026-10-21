import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DevelopersPage, developersMeta } from '@/features/developers';
import { buildReference } from '@/features/developers/lib/reference';
import { openApiDocument } from '@/features/developers/lib/spec';

import { renderWithShell } from '../../render-with-shell';

describe('the /developers/ page', () => {
  it('has one h1, the sections in order and an anchor per operation', () => {
    const { container } = renderWithShell(<DevelopersPage />, '/developers/');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The Arena API, in the open.');
    const sectionIds = [...container.querySelectorAll('main section[id]')]
      .map(section => section.id)
      .filter(id => !id.includes('-api-') && !id.startsWith('get-') && !id.startsWith('post-'));
    expect(sectionIds).toEqual(['overview', 'quickstart', 'operations', 'problems', 'rate-limits', 'versioning', 'more']);
    for (const operation of buildReference(openApiDocument).operations) {
      expect(container.querySelectorAll(`#${operation.id}`), operation.id).toHaveLength(1);
    }
    const ids = [...container.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links every in-page navigation entry to an existing section', () => {
    const { container } = renderWithShell(<DevelopersPage />, '/developers/');
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(nav).getAllByRole('link');
    expect(links.length).toBe(7);
    for (const link of links) {
      const id = link.getAttribute('href')?.slice(1) ?? '';
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it('shows the problem types table, with a link to each type page, and the examples', () => {
    renderWithShell(<DevelopersPage />, '/developers/');
    const table = screen.getByRole('region', { name: 'Problem types' });
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBe(1 + buildReference(openApiDocument).problems.length);
    expect(within(table).getByRole('link', { name: 'rate_limited' })).toHaveAttribute('href', '/problems/rate_limited');
    expect(screen.getByRole('region', { name: 'curl example' })).toHaveTextContent('/api/v2/leaderboard');
    expect(
      screen.getByRole('region', { name: 'Example 200 response of GET /api/v2/leaderboard' }),
    ).toHaveTextContent('"eloRank": 1');
  });

  it('has the SEO tags of an indexable page', () => {
    const tags = developersMeta();
    expect(tags).toContainEqual({ title: 'API reference · DualMind Arena' });
    expect(tags).toContainEqual({ name: 'robots', content: 'index, follow' });
    expect(tags).toContainEqual(
      expect.objectContaining({ tagName: 'link', rel: 'canonical', href: 'https://arena.dualmindlab.tech/developers/' }),
    );
  });
});
