import type { IndexSuggestion, ParsedSchema } from './types';

/**
 * Suggest candidate indexes based on query AST and optional schema.
 */
export function suggestIndexes(ast: any, schema?: ParsedSchema): IndexSuggestion[] {
  const stmt = Array.isArray(ast) ? ast[0] : ast;
  if (!stmt || stmt.type?.toUpperCase() !== 'SELECT') return [];

  const suggestions: IndexSuggestion[] = [];
  const seen = new Set<string>();

  // 1. Index on WHERE clause columns
  if (stmt.where) {
    const whereCols = extractColumnsFromExpr(stmt.where);
    const byTable = groupByTable(whereCols);

    for (const [table, cols] of Object.entries(byTable)) {
      if (cols.length === 1) {
        const key = `${table}:${cols[0]}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            table: table || '(table)',
            columns: cols,
            type: 'single',
            reasoning: `Column '${cols[0]}' is used in a WHERE filter. An index would speed up row filtering.`,
          });
        }
      } else if (cols.length > 1) {
        const key = `${table}:${cols.sort().join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            table: table || '(table)',
            columns: cols,
            type: 'composite',
            reasoning: `Columns ${cols.map(c => `'${c}'`).join(', ')} are used together in WHERE. A composite index in this order would be most efficient.`,
          });
        }
      }
    }
  }

  // 2. Index on JOIN columns
  if (stmt.from && Array.isArray(stmt.from)) {
    for (const item of stmt.from) {
      if (item.join && item.on) {
        const joinCols = extractColumnsFromExpr(item.on);
        const byTable = groupByTable(joinCols);

        for (const [table, cols] of Object.entries(byTable)) {
          for (const col of cols) {
            const key = `${table}:${col}:join`;
            if (!seen.has(key)) {
              seen.add(key);
              // Check if this is likely already a primary key
              const isLikelyPK = col === 'id' || col.endsWith('_id');
              if (!isLikelyPK || table) {
                suggestions.push({
                  table: table || '(table)',
                  columns: [col],
                  type: 'single',
                  reasoning: `Column '${col}' is used in a JOIN condition. An index ensures efficient join lookups.`,
                });
              }
            }
          }
        }
      }
    }
  }

  // 3. Index on ORDER BY columns (if no LIMIT or if used with WHERE)
  if (stmt.orderby) {
    const orderCols = stmt.orderby
      .map((o: any) => {
        if (o.expr?.type === 'column_ref') {
          return { table: o.expr.table || '', column: o.expr.column };
        }
        return null;
      })
      .filter(Boolean);

    if (orderCols.length > 0) {
      const byTable = groupByTable(
        orderCols.map((c: any) => ({ table: c.table, column: c.column }))
      );

      for (const [table, cols] of Object.entries(byTable)) {
        const key = `${table}:${cols.join(',')}:order`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            table: table || '(table)',
            columns: cols,
            type: cols.length > 1 ? 'composite' : 'single',
            reasoning: `Column${cols.length > 1 ? 's' : ''} used in ORDER BY. An index can avoid a file sort operation.`,
          });
        }
      }
    }
  }

  // 4. Covering index suggestion (WHERE + SELECT columns from same table)
  if (stmt.where && Array.isArray(stmt.columns) && stmt.columns !== '*') {
    const whereCols = extractColumnsFromExpr(stmt.where);
    const selectCols = stmt.columns
      .filter((c: any) => c.expr?.type === 'column_ref')
      .map((c: any) => ({ table: c.expr.table || '', column: c.expr.column }));

    const allCols = [...whereCols, ...selectCols];
    const byTable = groupByTable(allCols);

    for (const [table, cols] of Object.entries(byTable)) {
      const uniqueCols = [...new Set(cols)];
      if (uniqueCols.length >= 3 && uniqueCols.length <= 6) {
        const key = `${table}:covering:${uniqueCols.sort().join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push({
            table: table || '(table)',
            columns: uniqueCols,
            type: 'covering',
            reasoning: `A covering index on these columns would allow the query to be answered entirely from the index without reading the table data.`,
          });
        }
      }
    }
  }

  // Deduplicate and limit suggestions
  return deduplicateSuggestions(suggestions).slice(0, 8);
}

// ─── Helpers ───────────────────────────────────────────────────────

interface ColRef {
  table: string;
  column: string;
}

function extractColumnsFromExpr(expr: any): ColRef[] {
  if (!expr) return [];

  if (expr.type === 'column_ref') {
    return [{ table: expr.table || '', column: expr.column }];
  }

  if (expr.type === 'binary_expr') {
    return [
      ...extractColumnsFromExpr(expr.left),
      ...extractColumnsFromExpr(expr.right),
    ];
  }

  if (expr.type === 'expr_list' && Array.isArray(expr.value)) {
    return expr.value.flatMap((v: any) => extractColumnsFromExpr(v));
  }

  return [];
}

function groupByTable(cols: ColRef[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const col of cols) {
    const table = col.table || '_unknown_';
    if (!groups[table]) groups[table] = [];
    if (!groups[table].includes(col.column)) {
      groups[table].push(col.column);
    }
  }
  return groups;
}

function deduplicateSuggestions(suggestions: IndexSuggestion[]): IndexSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.table}:${s.columns.sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
