import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { RoleBadge } from '@/components/ui/role-badge';
import { Separator } from '@/components/ui/separator';

import { KitCard, KitState } from './kit-card';

/** Role badges (with their A / B letters), status and label badges, avatars and keys. */
export function KitBadges() {
  return (
    <KitCard
      title="Badges, roles and keys"
      source="@/components/ui/badge, role-badge, avatar, kbd, separator"
      description="Mind A and Mind B always carry their letter, and keep their side. After the reveal the badge takes the model's name and keeps the role for screen readers."
      className="lg:col-span-2"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10">
        <div className="grid content-start gap-6">
          <KitState label="Roles">
            <RoleBadge who="a" />
            <RoleBadge who="b" />
            <RoleBadge who="human" />
          </KitState>
          <KitState label="Roles after the reveal, small and letter only">
            <RoleBadge who="a" label="Model Atlas" size="sm" />
            <RoleBadge who="b" label="Model Borealis" size="sm" />
            <RoleBadge who="a" letterOnly />
            <RoleBadge who="b" letterOnly />
            <RoleBadge who="human" letterOnly />
          </KitState>
        </div>
        <Separator orientation="vertical" className="hidden lg:block" />
        <div className="grid content-start gap-6">
          <KitState label="Labels and status">
            <Badge>Beta</Badge>
            <Badge variant="outline">Open weights</Badge>
            <Badge variant="mind-a">Mind A</Badge>
            <Badge variant="mind-b">Mind B</Badge>
            <Badge variant="human">Your pick</Badge>
            <Badge variant="ok">Online</Badge>
            <Badge variant="warn">Provisional</Badge>
            <Badge variant="bad">Offline</Badge>
          </KitState>
          <div className="grid gap-6 sm:grid-cols-2">
            <KitState label="Avatars">
              <Avatar size="lg">
                <AvatarFallback>AL</AvatarFallback>
                <AvatarBadge />
              </Avatar>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback>GH</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>MK</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>+9</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </KitState>
            <KitState label="Keys">
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
              <Kbd>1</Kbd>
              <Kbd>2</Kbd>
              <Kbd>Esc</Kbd>
              <Kbd>Enter</Kbd>
            </KitState>
          </div>
        </div>
      </div>
    </KitCard>
  );
}
