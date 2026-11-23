import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CrowdCategory } from '@/lib/api';

export const ALL_CATEGORIES = 'all';

export interface CategoryTabsProps {
  categories: readonly CrowdCategory[];
  value: string;
  onValueChange: (value: string) => void;
  /** The board for the selected tab. */
  children: ReactNode;
}

/**
 * The crowd board's category tabs: "All prompts" (the overall board) and one tab per prompt
 * category the backend serves. Arrow keys move between tabs (Base UI), the panel is the board
 * below. Only rendered when the backend has categories on.
 */
export function CategoryTabs({ categories, value, onValueChange, children }: CategoryTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={next => onValueChange(String(next))}
      className="gap-6"
      data-testid="category-tabs"
    >
      <div className="grid gap-2">
        <span className="eyebrow text-muted" id="crowd-tabs-label">
          Crowd votes by prompt category
        </span>
        <div className="-mx-1 overflow-x-auto px-1 pb-px">
          <TabsList variant="line" aria-labelledby="crowd-tabs-label">
            <TabsTrigger value={ALL_CATEGORIES}>All prompts</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id} title={category.description}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
      <TabsContent value={value} className="grid gap-6 text-fg">
        {children}
      </TabsContent>
    </Tabs>
  );
}
