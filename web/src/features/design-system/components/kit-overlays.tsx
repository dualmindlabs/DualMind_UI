import {
  CircleQuestionMark,
  Copy,
  Flag,
  LogOut,
  Settings,
  SlidersHorizontal,
  User,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Kbd } from '@/components/ui/kbd';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/use-theme';
import { isThemePreference } from '@/lib/theme/theme';

import { KitCard, KitState } from './kit-card';
import { ModelPicker } from './model-picker';

/**
 * Dialog, sheet, drawer, menu, popover and tooltip. All trap or manage focus, close on Esc and
 * hand focus back to their trigger.
 */
export function KitOverlays() {
  const { preference, setPreference } = useTheme();

  return (
    <KitCard
      title="Overlays"
      source="@/components/ui/dialog, sheet, drawer, dropdown-menu, popover, tooltip, command"
      description="Open each one with the keyboard too: focus moves in, Esc closes, and focus returns to the button that opened it. The model picker is the command list in a popover: type to filter, arrows to move, Enter to pick."
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap gap-x-8 gap-y-6">
        <KitState label="Dialog">
          <Dialog>
            <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Flag aria-hidden="true" strokeWidth={1.75} />
              Report
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report this answer?</DialogTitle>
                <DialogDescription>
                  Tell us what is wrong. Reports are reviewed by a person within two days.
                </DialogDescription>
              </DialogHeader>
              <Field label="What is wrong?">
                {control => (
                  <Textarea {...control} name="report" rows={3} placeholder="It made up a source" />
                )}
              </Field>
              <DialogFooter>
                <DialogClose className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  Cancel
                </DialogClose>
                <DialogClose className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                  Send report
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </KitState>

        <KitState label="Sheet">
          <Sheet>
            <SheetTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} />
              Filters
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter the leaderboard</SheetTitle>
                <SheetDescription>Changes apply as you make them.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <Field label="Open-weight models only" layout="control-end">
                  {control => <Switch {...control} name="open-weights" />}
                </Field>
                <Field label="Hide provisional ratings" layout="control-end">
                  {control => <Switch {...control} name="provisional" defaultChecked />}
                </Field>
              </SheetBody>
              <SheetFooter>
                <Button variant="ghost" size="sm">
                  Reset
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </KitState>

        <KitState label="Drawer">
          <Drawer>
            <DrawerTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Share
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Share this battle</DrawerTitle>
                <DrawerDescription>
                  The link shows both answers and your vote, never your account.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose className={buttonVariants({ variant: 'primary' })}>
                  <Copy aria-hidden="true" strokeWidth={1.75} />
                  Copy link
                </DrawerClose>
                <DrawerClose className={buttonVariants({ variant: 'ghost' })}>Cancel</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </KitState>

        <KitState label="Menu">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              aria-label="Ada, account menu"
            >
              <User aria-hidden="true" strokeWidth={1.75} />
              Ada
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>ada@example.com</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Settings aria-hidden="true" strokeWidth={1.75} />
                  Settings
                  <DropdownMenuShortcut>Ctrl ,</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={preference}
                  onValueChange={value => {
                    if (isThemePreference(value)) setPreference(value);
                  }}
                >
                  <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOut aria-hidden="true" strokeWidth={1.75} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </KitState>

        <KitState label="Popover">
          <Popover>
            <PopoverTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              What is Elo?
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Elo rating</PopoverTitle>
                <PopoverDescription>
                  A score that rises when a model wins a vote and falls when it loses. Beating a
                  stronger model moves it more.
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </KitState>

        <KitState label="Tooltip">
          <Tooltip>
            <TooltipTrigger
              className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
              aria-label="How voting works"
            >
              <CircleQuestionMark aria-hidden="true" strokeWidth={1.75} />
            </TooltipTrigger>
            <TooltipContent>
              How voting works <Kbd>?</Kbd>
            </TooltipContent>
          </Tooltip>
        </KitState>

        <KitState label="Model picker">
          <ModelPicker />
        </KitState>
      </div>
    </KitCard>
  );
}
