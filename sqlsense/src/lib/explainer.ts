import type { ExplanationResult } from './types';

/**
 * Generate a plain-English explanation of a parsed SQL AST.
 */
export function explain(ast: any): ExplanationResult {
  // Handle array of statements
  const stmt = Array.isArray(ast) ? ast[0] : ast;

  if (!stmt) {
    return { summary: 'Empty query.', steps: [] };
  }

  const type = (stmt.type || '').toUpperCase();

  switch (type) {
    case 'SELECT':
      return explainSelect(stmt);
    case 'INSERT':
      return explainInsert(stmt);
    case 'UPDATE':
      return explainUpdate(stmt);
    case 'DELETE':
      return explainDelete(stmt);
    default:
      return { summary: `This is a ${type || 'unknown'} statement.`, steps: [] };
  }
}

function explainSelect(ast: any): ExplanationResult {
  const steps: string[] = [];

  // Source tables
  const tables = extractTables(ast.from);
  if (tables.length > 0) {
    steps.push(`Reads data from ${formatTableList(tables)}`);
  }

  // Joins
  if (ast.from) {
    const joins = extractJoins(ast.from);
    for (const join of joins) {
      steps.push(join);
    }
  }

  // WHERE clause
  if (ast.where) {
    const conditions = humanizeExpression(ast.where);
    steps.push(`Filters rows where ${conditions}`);
  }

  // GROUP BY
  if (ast.groupby) {
    const groupArr = Array.isArray(ast.groupby) ? ast.groupby : [ast.groupby];
    const groups = groupArr.map((g: any) => resolveColumn(g)).filter(Boolean);
    if (groups.length > 0) {
      steps.push(`Groups results by ${groups.join(', ')}`);
    }
  }

  // Aggregates
  const aggregates = extractAggregates(ast.columns);
  if (aggregates.length > 0) {
    steps.push(`Computes ${aggregates.join(', ')}`);
  }

  // HAVING
  if (ast.having) {
    steps.push(`Keeps only groups where ${humanizeExpression(ast.having)}`);
  }

  // SELECT columns
  if (ast.columns === '*') {
    steps.push('Returns all columns');
  } else if (Array.isArray(ast.columns)) {
    const cols = ast.columns.map((c: any) => {
      if (c.expr?.type === 'column_ref') {
        return resolveColumn(c.expr);
      }
      if (c.as) return c.as;
      return resolveExpr(c.expr);
    }).filter(Boolean);

    if (cols.length <= 6) {
      steps.push(`Selects ${cols.join(', ')}`);
    } else {
      steps.push(`Selects ${cols.length} columns`);
    }
  }

  // DISTINCT
  if (ast.distinct) {
    steps.push('Removes duplicate rows');
  }

  // ORDER BY
  if (ast.orderby) {
    const orderArr = Array.isArray(ast.orderby) ? ast.orderby : [ast.orderby];
    const sorts = orderArr.map((o: any) => {
      const col = resolveExpr(o.expr);
      const dir = (o.type || 'ASC').toUpperCase();
      return `${col} (${dir === 'DESC' ? 'highest first' : 'lowest first'})`;
    });
    steps.push(`Sorts by ${sorts.join(', ')}`);
  }

  // LIMIT
  if (ast.limit) {
    const val = ast.limit.value?.[0]?.value ?? ast.limit.value;
    if (val !== undefined && val !== null) {
      steps.push(`Returns only the top ${val} results`);
    }
  }

  // Generate summary
  const summary = generateSummary(ast, tables, aggregates);

  return { summary, steps };
}

function explainInsert(ast: any): ExplanationResult {
  const steps: string[] = [];
  const table = ast.table?.[0]?.table || 'unknown table';

  steps.push(`Inserts data into the '${table}' table`);

  if (ast.columns) {
    steps.push(`Sets values for columns: ${ast.columns.join(', ')}`);
  }

  if (ast.values) {
    const count = Array.isArray(ast.values) ? ast.values.length : 1;
    steps.push(`Adds ${count} row${count > 1 ? 's' : ''}`);
  }

  return {
    summary: `This query inserts new records into the '${table}' table.`,
    steps,
  };
}

function explainUpdate(ast: any): ExplanationResult {
  const steps: string[] = [];
  const table = ast.table?.[0]?.table || 'unknown table';

  steps.push(`Updates records in the '${table}' table`);

  if (ast.set) {
    const sets = ast.set.map((s: any) => s.column || 'column').slice(0, 5);
    steps.push(`Modifies columns: ${sets.join(', ')}${ast.set.length > 5 ? ` and ${ast.set.length - 5} more` : ''}`);
  }

  if (ast.where) {
    steps.push(`Only affects rows where ${humanizeExpression(ast.where)}`);
  } else {
    steps.push('⚠️ No WHERE clause — this will update ALL rows in the table');
  }

  return {
    summary: `This query updates records in the '${table}' table.`,
    steps,
  };
}

function explainDelete(ast: any): ExplanationResult {
  const steps: string[] = [];
  const table = ast.from?.[0]?.table || ast.table?.[0]?.table || 'unknown table';

  steps.push(`Deletes records from the '${table}' table`);

  if (ast.where) {
    steps.push(`Only removes rows where ${humanizeExpression(ast.where)}`);
  } else {
    steps.push('⚠️ No WHERE clause — this will delete ALL rows from the table');
  }

  return {
    summary: `This query removes records from the '${table}' table.`,
    steps,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function extractTables(from: any): { name: string; alias: string | null }[] {
  if (!from) return [];
  const tables: { name: string; alias: string | null }[] = [];

  for (const item of (Array.isArray(from) ? from : [from])) {
    if (item.table) {
      tables.push({ name: item.table, alias: item.as || null });
    }
    if (item.expr?.table) {
      tables.push({ name: item.expr.table, alias: item.expr.as || null });
    }
  }

  return tables;
}

function extractJoins(from: any): string[] {
  if (!from || !Array.isArray(from)) return [];
  const joins: string[] = [];

  for (const item of from) {
    if (item.join) {
      const joinType = (item.join || 'JOIN').toUpperCase().replace(/,/g, '');
      const table = item.table || 'unknown';
      const alias = item.as ? ` (as '${item.as}')` : '';
      const on = item.on ? ` on ${humanizeExpression(item.on)}` : '';
      joins.push(`${joinType} joins '${table}'${alias}${on}`);
    }
  }

  return joins;
}

function extractAggregates(columns: any): string[] {
  if (!columns || columns === '*') return [];
  const aggs: string[] = [];

  for (const col of (Array.isArray(columns) ? columns : [])) {
    if (col.expr?.type === 'aggr_func') {
      const func = col.expr.name || 'aggregate';
      const arg = resolveExpr(col.expr.args?.expr) || '*';
      const alias = col.as ? ` as ${col.as}` : '';
      aggs.push(`${func}(${arg})${alias}`);
    }
  }

  return aggs;
}

function resolveColumn(expr: any): string {
  if (!expr) return '';
  if (typeof expr === 'string') return expr;
  if (expr.type === 'column_ref') {
    const table = expr.table ? `${expr.table}.` : '';
    return `${table}${expr.column}`;
  }
  return resolveExpr(expr);
}

function resolveExpr(expr: any): string {
  if (!expr) return '';
  if (typeof expr === 'string') return expr;
  if (typeof expr === 'number') return String(expr);

  switch (expr.type) {
    case 'column_ref':
      return resolveColumn(expr);
    case 'binary_expr':
      return `${resolveExpr(expr.left)} ${expr.operator} ${resolveExpr(expr.right)}`;
    case 'number':
      return String(expr.value);
    case 'single_quote_string':
    case 'string':
      return `'${expr.value}'`;
    case 'aggr_func':
      return `${expr.name}(${resolveExpr(expr.args?.expr) || '*'})`;
    case 'function':
      return `${expr.name}(...)`;
    case 'star':
      return '*';
    case 'expr_list':
      if (Array.isArray(expr.value)) {
        return expr.value.map((e: any) => resolveExpr(e)).join(', ');
      }
      return '(...)';
    default:
      if (expr.value !== undefined) return String(expr.value);
      return '(expression)';
  }
}

function humanizeExpression(expr: any): string {
  if (!expr) return '';

  if (expr.type === 'binary_expr') {
    const left = humanizeExpression(expr.left);
    const right = humanizeExpression(expr.right);
    const op = humanizeOperator(expr.operator);
    return `${left} ${op} ${right}`;
  }

  return resolveExpr(expr);
}

function humanizeOperator(op: string): string {
  const map: Record<string, string> = {
    '=': 'equals',
    '!=': 'is not equal to',
    '<>': 'is not equal to',
    '>': 'is greater than',
    '<': 'is less than',
    '>=': 'is at least',
    '<=': 'is at most',
    'LIKE': 'matches the pattern',
    'NOT LIKE': 'does not match',
    'IN': 'is one of',
    'NOT IN': 'is not one of',
    'IS': 'is',
    'IS NOT': 'is not',
    'BETWEEN': 'is between',
    'AND': 'and',
    'OR': 'or',
  };
  return map[op?.toUpperCase()] || op;
}

function formatTableList(tables: { name: string; alias: string | null }[]): string {
  return tables
    .map(t => t.alias ? `'${t.name}' (as '${t.alias}')` : `'${t.name}'`)
    .join(', ');
}

function generateSummary(
  ast: any,
  tables: { name: string; alias: string | null }[],
  aggregates: string[]
): string {
  const tableNames = tables.map(t => t.name).join(' and ');

  if (aggregates.length > 0 && ast.groupby) {
    const gArr = Array.isArray(ast.groupby) ? ast.groupby : [ast.groupby];
    const groupCols = gArr.map((g: any) => resolveColumn(g)).join(', ');
    return `This query analyzes data from ${tableNames}, grouped by ${groupCols}, computing ${aggregates.join(', ')}.`;
  }

  if (aggregates.length > 0) {
    return `This query computes ${aggregates.join(', ')} from ${tableNames}.`;
  }

  if (ast.where && tables.length > 1) {
    return `This query retrieves filtered data by joining ${tableNames}.`;
  }

  if (tables.length > 1) {
    return `This query combines data from ${tableNames}.`;
  }

  if (ast.where) {
    return `This query retrieves filtered data from ${tableNames}.`;
  }

  return `This query reads data from ${tableNames}.`;
}
