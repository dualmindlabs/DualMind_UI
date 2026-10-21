import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/**
 * A password input with a show/hide button (a 44px target inside the field's right edge). The
 * button is a toggle (`aria-pressed`) with a fixed name, so its state is announced, not its label
 * swapped. Pair it with <Field>, which passes the id and the described-by wiring.
 */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn('pr-12', className)}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label="Show password"
        {...(props.id ? { 'aria-controls': props.id } : {})}
        onClick={() => setVisible(value => !value)}
        className="absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center rounded-r-sm text-muted transition-colors duration-(--dur-fast) hover:text-fg"
      >
        <Icon aria-hidden="true" className="size-4.5" />
      </button>
    </div>
  );
}
