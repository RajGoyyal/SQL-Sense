import type { QuerySummary, TableRef, JoinInfo, OrderByInfo } from './types';

/**
 * Extract a structured summary from a parsed SQL AST.
 */
export function summarize(ast: any): QuerySummary {
  const stmt = Array.isArray(ast) ? ast[0] : ast;

  if (!stmt) {
    return emptySummary();
  }

  const type = (stmt.type || 'UNKNOWN').toUpperCase();

  return {
    queryType: type,
    tables: extractTables(stmt),
    columns: extractColumns(stmt),
    joins: extractJoins(stmt),
    filters: extractFilters(stmt),
    groupBy: extractGroupBy(stmt),
    orderBy: extractOrderBy(stmt),
    limit: extractLimit(stmt),
    aggregates: extractAggregates(stmt),
    subqueries: countSubqueries(stmt),
    hasDistinct: !!stmt.distinct,
    hasHaving: !!stmt.having,
  };
}

function emptySummary(): QuerySummary {
  return {
    queryType: 'UNKNOWN',
    tables: [],
    columns: [],
    joins: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    limit: null,
    aggregates: [],
    subqueries: 0,
    hasDistinct: false,
    hasHaving: false,
  };
}

function extractTables(ast: any): TableRef[] {
  const tables: TableRef[] = [];

  if (ast.from) {
    for (const item of (Array.isArray(ast.from) ? ast.from : [ast.from])) {
      if (item.table) {
        tables.push({ name: item.table, alias: item.as || null });
      }
    }
  }

  // For INSERT / UPDATE
  if (ast.table) {
    for (const item of (Array.isArray(ast.table) ? ast.table : [ast.table])) {
      if (item.table) {
        tables.push({ name: item.table, alias: item.as || null });
      }
    }
  }

  return tables;
}

function extractColumns(ast: any): string[] {
  if (ast.columns === '*') return ['*'];
  if (!Array.isArray(ast.columns)) return [];

  return ast.columns.map((col: any) => {
    if (col.expr?.type === 'column_ref') {
      const table = col.expr.table ? `${col.expr.table}.` : '';
      const alias = col.as ? ` AS ${col.as}` : '';
      return `${table}${col.expr.column}${alias}`;
    }
    if (col.expr?.type === 'aggr_func') {
      const func = col.expr.name;
      const arg = resolveSimpleExpr(col.expr.args?.expr);
      const alias = col.as ? ` AS ${col.as}` : '';
      return `${func}(${arg})${alias}`;
    }
    if (col.as) return col.as;
    return resolveSimpleExpr(col.expr);
  }).filter(Boolean);
}

function extractJoins(ast: any): JoinInfo[] {
  if (!ast.from || !Array.isArray(ast.from)) return [];

  const joins: JoinInfo[] = [];
  const firstTable = ast.from[0]?.table || 'unknown';

  for (const item of ast.from) {
    if (item.join) {
      joins.push({
        type: (item.join || 'JOIN').toUpperCase(),
        from: firstTable,
        to: item.table || 'unknown',
        on: item.on ? exprToString(item.on) : '',
      });
    }
  }

  return joins;
}

function extractFilters(ast: any): string[] {
  if (!ast.where) return [];
  return flattenConditions(ast.where);
}

function flattenConditions(expr: any): string[] {
  if (!expr) return [];

  if (expr.type === 'binary_expr' && (expr.operator === 'AND' || expr.operator === 'OR')) {
    return [
      ...flattenConditions(expr.left),
      ...flattenConditions(expr.right),
    ];
  }

  return [exprToString(expr)];
}

function extractGroupBy(ast: any): string[] {
  if (!ast.groupby) return [];
  return ast.groupby.map((g: any) => {
    if (g.type === 'column_ref') {
      const table = g.table ? `${g.table}.` : '';
      return `${table}${g.column}`;
    }
    return resolveSimpleExpr(g);
  }).filter(Boolean);
}

function extractOrderBy(ast: any): OrderByInfo[] {
  if (!ast.orderby) return [];
  return ast.orderby.map((o: any) => ({
    expr: resolveSimpleExpr(o.expr),
    direction: ((o.type || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
  }));
}

function extractLimit(ast: any): number | null {
  if (!ast.limit) return null;
  if (ast.limit.value?.[0]?.value !== undefined) {
    return ast.limit.value[0].value;
  }
  if (typeof ast.limit.value === 'number') {
    return ast.limit.value;
  }
  return null;
}

function extractAggregates(ast: any): string[] {
  if (!Array.isArray(ast.columns)) return [];

  const aggs: string[] = [];
  for (const col of ast.columns) {
    if (col.expr?.type === 'aggr_func') {
      aggs.push(col.expr.name);
    }
  }
  return [...new Set(aggs)];
}

function countSubqueries(ast: any): number {
  let count = 0;
  const json = JSON.stringify(ast);
  const matches = json.match(/"type"\s*:\s*"select"/g);
  if (matches) {
    count = matches.length - 1; // Subtract the main query itself
  }
  return Math.max(0, count);
}

function resolveSimpleExpr(expr: any): string {
  if (!expr) return '*';
  if (typeof expr === 'string') return expr;
  if (typeof expr === 'number') return String(expr);

  if (expr.type === 'column_ref') {
    const table = expr.table ? `${expr.table}.` : '';
    return `${table}${expr.column}`;
  }
  if (expr.type === 'aggr_func') {
    return `${expr.name}(${resolveSimpleExpr(expr.args?.expr)})`;
  }
  if (expr.type === 'number') return String(expr.value);
  if (expr.type === 'single_quote_string' || expr.type === 'string') return `'${expr.value}'`;
  if (expr.type === 'star') return '*';
  if (expr.value !== undefined) return String(expr.value);
  return '(expr)';
}

function exprToString(expr: any): string {
  if (!expr) return '';

  if (expr.type === 'binary_expr') {
    return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
  }

  return resolveSimpleExpr(expr);
}
