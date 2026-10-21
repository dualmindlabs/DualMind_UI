import { Badge } from '@/components/ui/badge';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  ARENA_PREFERENCE_KEYS,
  sendKeyFrom,
  SHORTCUT_GROUPS,
  useStoredValue,
} from '@/features/arena';
import { useModifierKey } from '@/hooks/use-modifier-key';

import { displayKeys, shortcutGroupsFor } from '../lib/shortcut-table';
import { SettingsSection } from './settings-card';

/**
 * The arena's keyboard map, read-only, as tables (one per group, with a caption): what each
 * shortcut does and its keys in <kbd>. Single-key shortcuts say when they are turned off, and the
 * prompt box rows follow the send-key setting.
 */
export function ShortcutsSection() {
  const modifier = useModifierKey();
  const [shortcuts] = useStoredValue(ARENA_PREFERENCE_KEYS.shortcuts);
  const [send] = useStoredValue(ARENA_PREFERENCE_KEYS.send);
  const singleKeysOn = shortcuts !== 'off';
  const groups = shortcutGroupsFor(SHORTCUT_GROUPS, sendKeyFrom(send));

  return (
    <SettingsSection
      id="shortcuts"
      title="Keyboard shortcuts"
      description="The arena works from the keyboard. Single keys work when you are not typing in a text field."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
        {groups.map((group, index) => (
          <table
            key={group.heading}
            className={index === 0 ? 'w-full' : 'w-full border-t border-line'}
            data-testid="shortcut-table"
          >
            <caption className="px-5 pt-5 pb-2 text-left eyebrow text-muted sm:px-6">
              {group.heading}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  Action
                </th>
                <th scope="col" className="sr-only">
                  Keys
                </th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map(entry => {
                const off = entry.single === true && !singleKeysOn;
                return (
                  <tr key={entry.keys.join('+')} className="border-t border-line first:border-t-0">
                    <td className="py-3 pr-3 pl-5 align-middle text-ui-sm text-fg sm:pl-6">
                      <span className={off ? 'text-muted' : undefined}>{entry.description}</span>
                      {off ? (
                        <Badge variant="neutral" className="ml-2 align-middle">
                          Off
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-3 pr-5 pl-3 text-right align-middle whitespace-nowrap sm:pr-6">
                      <KbdGroup>
                        {displayKeys(entry.keys, modifier).map(key => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </KbdGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>
    </SettingsSection>
  );
}
