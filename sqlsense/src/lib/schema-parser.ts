import type { ParsedSchema, SchemaTable, SchemaColumn, ForeignKey } from './types';

/**
 * Parse DDL (CREATE TABLE statements) into a structured schema model.
 * Uses regex-based parsing for lightweight, Vercel-friendly execution.
 */
export function parseSchema(ddl: string): ParsedSchema {
  const tables: SchemaTable[] = [];

  // Match CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)\s*;/gi;

  let match;
  while ((match = tableRegex.exec(ddl)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const table = parseTableBody(tableName, body);
    tables.push(table);
  }

  return { tables };
}

function parseTableBody(tableName: string, body: string): SchemaTable {
  const columns: SchemaColumn[] = [];
  const primaryKey: string[] = [];
  const foreignKeys: ForeignKey[] = [];

  // Split by commas, but respect parentheses nesting
  const parts = splitColumns(body);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // PRIMARY KEY constraint
    const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      const cols = pkMatch[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
      primaryKey.push(...cols);
      continue;
    }

    // FOREIGN KEY constraint
    const fkMatch = trimmed.match(
      /^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i
    );
    if (fkMatch) {
      foreignKeys.push({
        columns: fkMatch[1].split(',').map(c => c.trim().replace(/[`"']/g, '')),
        refTable: fkMatch[2],
        refColumns: fkMatch[3].split(',').map(c => c.trim().replace(/[`"']/g, '')),
      });
      continue;
    }

    // INDEX / KEY / UNIQUE / CHECK constraints
    if (/^(INDEX|KEY|UNIQUE|CHECK|CONSTRAINT)\s/i.test(trimmed)) {
      continue;
    }

    // Column definition
    const colMatch = trimmed.match(
      /^[`"']?(\w+)[`"']?\s+([\w]+(?:\s*\([^)]*\))?(?:\s+UNSIGNED)?)/i
    );
    if (colMatch) {
      const colName = colMatch[1];
      const colType = colMatch[2].toUpperCase();
      const isNullable = !/NOT\s+NULL/i.test(trimmed);
      const isPrimary = /PRIMARY\s+KEY/i.test(trimmed);

      if (isPrimary) {
        primaryKey.push(colName);
      }

      // Check for inline REFERENCES
      const inlineFK = trimmed.match(
        /REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i
      );
      if (inlineFK) {
        foreignKeys.push({
          columns: [colName],
          refTable: inlineFK[1],
          refColumns: inlineFK[2].split(',').map(c => c.trim().replace(/[`"']/g, '')),
        });
      }

      const isForeign = foreignKeys.some(fk => fk.columns.includes(colName));

      // Default value
      const defaultMatch = trimmed.match(/DEFAULT\s+([^\s,]+)/i);
      const defaultValue = defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : undefined;

      columns.push({
        name: colName,
        type: colType,
        nullable: isNullable,
        isPrimary,
        isForeign,
        defaultValue,
      });
    }
  }

  // Update isPrimary and isForeign based on table-level constraints
  for (const col of columns) {
    if (primaryKey.includes(col.name)) {
      col.isPrimary = true;
    }
    if (foreignKeys.some(fk => fk.columns.includes(col.name))) {
      col.isForeign = true;
    }
  }

  return { name: tableName, columns, primaryKey, foreignKeys };
}

function splitColumns(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}
