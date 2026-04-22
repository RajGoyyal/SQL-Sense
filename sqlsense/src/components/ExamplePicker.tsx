'use client';

import { examples } from '@/lib/examples';
import type { ExampleQuery } from '@/lib/types';

interface ExamplePickerProps {
  onSelect: (example: ExampleQuery) => void;
}

export default function ExamplePicker({ onSelect }: ExamplePickerProps) {
  return (
    <div className="example-chips">
      {examples.map(ex => (
        <button
          key={ex.id}
          className="example-chip"
          onClick={() => onSelect(ex)}
          title={ex.description}
        >
          {ex.name}
        </button>
      ))}
    </div>
  );
}
