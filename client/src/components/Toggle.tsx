import React, { FunctionComponent } from 'react';

export const Toggle: FunctionComponent<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = (props) => {
  const { label, checked, onChange } = props;

  return (
    <label className="relative cursor-pointer select-none">
      <div className="inline-flex items-center gap-2">
        <div className="inline-block pb-2">
          <input
            className="mr-1 sr-only peer"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />

          <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full translate-all duration-300"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
        </div>

        <span>{label}</span>
      </div>
    </label>
  );
};
