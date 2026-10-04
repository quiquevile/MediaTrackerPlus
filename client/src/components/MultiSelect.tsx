import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';

export const MultiSelect: FunctionComponent<{
  label: string;
  values: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}> = (props) => {
  const { label, values, selected, onChange } = props;
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        ref &&
        ref.current &&
        ref.current !== event.target &&
        !ref.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const summary =
    selected.length === 0 ? (
      <Trans>All</Trans>
    ) : (
      <Trans>{selected.length} selected</Trans>
    );

  return (
    <div className="flex select-none">
      <div
        className="relative ml-2 cursor-pointer select-none"
        ref={ref}
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="flex ml-2 cursor-pointer select-none">
          <span className="material-icons">filter_alt</span>&nbsp;
          {label}: {summary}
        </div>

        {showMenu && (
          <ul className="absolute right-0 z-10 transition-all rounded shadow-lg shadow-black bg-zinc-100 dark:bg-gray-900">
            {values.length === 0 && (
              <li className="px-2 py-1 whitespace-nowrap opacity-50">—</li>
            )}

            {values.map((value) => (
              <li
                key={value}
                className={clsx(
                  'px-2 py-1 rounded hover:bg-red-700 whitespace-nowrap flex items-center gap-2',
                  selected.includes(value) &&
                    'dark:bg-slate-700 bg-zinc-300'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(value);
                }}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.includes(value)}
                />
                {value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
