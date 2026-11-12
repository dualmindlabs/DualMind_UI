import { ArrowRight, Check, Plus, Share2, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { KitCard, KitState } from './kit-card';

/** Every button variant, the sizes, and the states (hover shown pinned, focus pinned). */
export function KitButtons() {
  return (
    <KitCard
      title="Buttons"
      source="@/components/ui/button"
      description="Primary (Mind A cyan) for the main action, Mind B (terracotta) for the other corner, human (champagne) for your own action, then secondary, outline, ghost, destructive and link. Filled buttons carry a lit top edge. Loading keeps focus and width."
      className="lg:col-span-2"
    >
      <KitState label="Variants">
        <Button>
          Start a battle
          <ArrowRight aria-hidden="true" />
        </Button>
        <Button variant="mind-b">Pick Model B</Button>
        <Button variant="human">
          <Check aria-hidden="true" />
          Cast your vote
        </Button>
        <Button variant="secondary">Share</Button>
        <Button variant="outline">View leaderboard</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">
          <Trash aria-hidden="true" />
          Delete thread
        </Button>
        <Button variant="link">How voting works</Button>
      </KitState>
      <div className="grid gap-6 sm:grid-cols-2">
        <KitState label="Sizes: xs, sm, md, lg, icon">
          <Button size="xs" variant="secondary">
            Extra small
          </Button>
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button variant="secondary">Medium</Button>
          <Button size="lg" variant="secondary">
            Large
          </Button>
          <Button size="icon" variant="outline" aria-label="Share the battle">
            <Share2 aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="New thread">
            <Plus aria-hidden="true" />
          </Button>
        </KitState>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <KitState label="Hover">
            <Button className="bg-[color-mix(in_oklab,var(--mind-a)_86%,var(--fg))]" tabIndex={-1}>
              Vote
            </Button>
          </KitState>
          <KitState label="Focus">
            <Button className="focus-ring-demo" tabIndex={-1}>
              Vote
            </Button>
          </KitState>
          <KitState label="Disabled">
            <Button disabled>Vote</Button>
          </KitState>
          <KitState label="Loading">
            <Button loading variant="human">
              Saving
            </Button>
          </KitState>
        </div>
      </div>
    </KitCard>
  );
}
