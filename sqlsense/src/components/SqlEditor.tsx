'use client';

import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function SqlEditor({ value, onChange, placeholder, height = '200px' }: SqlEditorProps) {
  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  return (
    <div className="editor-wrapper">
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={[sql()]}
        placeholder={placeholder || 'Paste your SQL query here...'}
        height={height}
        theme="dark"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
