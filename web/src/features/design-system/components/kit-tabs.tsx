import { Bold, Code, Sigma, Type } from 'lucide-react';

import { GroupField } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { KitCard, KitState } from './kit-card';

/** Tabs with the sliding indicator, toggle groups and a single toggle. */
export function KitTabs() {
  return (
    <KitCard
      title="Tabs and toggles"
      source="@/components/ui/tabs, toggle-group"
      description="The segment tabs are the Arena's mode switch: the indicator slides with a transform and simply jumps under reduced motion. Arrow keys move between tabs and toggles."
    >
      <Tabs defaultValue="battle">
        <TabsList aria-label="Arena mode">
          <TabsTrigger value="battle" className="max-sm:px-2.5">
            Battle
          </TabsTrigger>
          <TabsTrigger value="side" className="max-sm:px-2.5">
            Side by side
          </TabsTrigger>
          <TabsTrigger value="direct" className="max-sm:px-2.5">
            Direct
          </TabsTrigger>
        </TabsList>
        <TabsContent value="battle" className="rounded-md border border-line bg-bg p-4">
          Two anonymous models answer. You vote, then the names are revealed.
        </TabsContent>
        <TabsContent value="side" className="rounded-md border border-line bg-bg p-4">
          You choose both models; the vote still counts toward the leaderboard.
        </TabsContent>
        <TabsContent value="direct" className="rounded-md border border-line bg-bg p-4">
          One model, one conversation. No vote.
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="overview">
        <TabsList variant="line" aria-label="Model details">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="battles">Battles</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Ranks, win rate and the latest battles.</TabsContent>
        <TabsContent value="battles">Every public battle this model fought.</TabsContent>
        <TabsContent value="pricing">Price per million tokens, input and output.</TabsContent>
      </Tabs>

      <div className="grid gap-6 sm:grid-cols-2">
        <GroupField label="Answer types">
          {group => (
            <ToggleGroup {...group} multiple defaultValue={['text', 'code']}>
              <ToggleGroupItem value="text">
                <Type aria-hidden="true" strokeWidth={1.75} />
                Text
              </ToggleGroupItem>
              <ToggleGroupItem value="code">
                <Code aria-hidden="true" strokeWidth={1.75} />
                Code
              </ToggleGroupItem>
              <ToggleGroupItem value="math">
                <Sigma aria-hidden="true" strokeWidth={1.75} />
                Math
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </GroupField>
        <KitState label="Toggle, off and on">
          <Toggle variant="outline" aria-label="Bold">
            <Bold aria-hidden="true" strokeWidth={2} />
          </Toggle>
          <Toggle variant="outline" defaultPressed aria-label="Bold, pressed">
            <Bold aria-hidden="true" strokeWidth={2} />
          </Toggle>
        </KitState>
      </div>
    </KitCard>
  );
}
