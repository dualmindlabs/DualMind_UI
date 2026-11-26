import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';

/**
 * "Also show models you cannot meet in a blind battle": the one switch that widens a board from
 * its default (models in blind battles) to the rest, which then carry their own labels. Says how
 * many models it adds, so the number is never hidden.
 */
export function ScopeSwitch({
  checked,
  onCheckedChange,
  hidden,
  label = 'Also show models you cannot meet in a blind battle',
  description,
  disabled = false,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** How many models the switch adds. */
  hidden: number;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  if (hidden === 0 && !checked) return null;
  return (
    <div className={cn('surface-duel px-4 py-3', className)} data-testid="scope-switch">
      <Field
        label={label}
        layout="control-end"
        description={
          description ??
          `${hidden} ${hidden === 1 ? 'model is' : 'models are'} left out by default: pick-only models (you can choose them in Side by side, but they are never drawn for a blind battle, so blind votes do not move their rating), retired models and models that are not chat models.`
        }
      >
        {control => (
          <Switch
            {...control}
            name="show-all-models"
            checked={checked}
            disabled={disabled}
            onCheckedChange={onCheckedChange}
          />
        )}
      </Field>
    </div>
  );
}
