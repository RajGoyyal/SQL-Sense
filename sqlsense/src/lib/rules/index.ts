import type { Rule } from '../types';

export const selectStarRule: Rule = {
  id: 'select-star',
  name: 'SELECT * Usage',
  severity: 'warning',
  check(ast) {
    if (ast.columns === '*') {
      return {
        severity: 'warning',
        rule: 'select-star',
        title: 'Avoid SELECT *',
        message: 'SELECT * fetches all columns from the table, which increases data transfer and memory usage.',
        suggestion: 'List only the columns you actually need. This reduces I/O, enables covering indexes, and makes the query more maintainable.',
      };
    }
    return null;
  },
};

export const missingWhereRule: Rule = {
  id: 'missing-where',
  name: 'Missing WHERE Clause',
  severity: 'critical',
  check(ast) {
    const type = (ast.type || '').toUpperCase();
    if ((type === 'UPDATE' || type === 'DELETE') && !ast.where) {
      return {
        severity: 'critical',
        rule: 'missing-where',
        title: `${type} Without WHERE`,
        message: `This ${type} statement has no WHERE clause and will affect ALL rows in the table.`,
        suggestion: 'Add a WHERE clause to limit which rows are affected, or confirm this is intentional.',
      };
    }
    return null;
  },
};

export const implicitJoinRule: Rule = {
  id: 'implicit-join',
  name: 'Implicit Join (Comma Syntax)',
  severity: 'info',
  check(ast) {
    if (!ast.from || !Array.isArray(ast.from)) return null;

    // Check if there are multiple tables without explicit JOINs
    const tablesWithoutJoin = ast.from.filter((f: any) => !f.join && f.table);
    if (tablesWithoutJoin.length > 1) {
      return {
        severity: 'info',
        rule: 'implicit-join',
        title: 'Implicit Join Detected',
        message: 'Tables are joined using comma syntax (old-style), which mixes join conditions with filter conditions in the WHERE clause.',
        suggestion: 'Use explicit JOIN ... ON syntax for better readability and to separate join logic from filtering logic.',
      };
    }
    return null;
  },
};

export const subqueryInSelectRule: Rule = {
  id: 'subquery-in-select',
  name: 'Subquery in SELECT',
  severity: 'warning',
  check(ast) {
    if (!ast.columns || ast.columns === '*') return null;
    if (!Array.isArray(ast.columns)) return null;

    for (const col of ast.columns) {
      if (col.expr?.type === 'select' || col.expr?.ast?.type === 'select') {
        return {
          severity: 'warning',
          rule: 'subquery-in-select',
          title: 'Correlated Subquery in SELECT',
          message: 'A subquery in the SELECT list may execute once per row, causing N+1 performance issues.',
          suggestion: 'Consider rewriting using a JOIN or a CTE (WITH clause) to compute the value in a single pass.',
        };
      }
    }
    return null;
  },
};

export const functionOnColumnRule: Rule = {
  id: 'function-on-column',
  name: 'Function on Indexed Column',
  severity: 'warning',
  check(ast) {
    if (!ast.where) return null;

    const found = findFunctionOnColumn(ast.where);
    if (found) {
      return {
        severity: 'warning',
        rule: 'function-on-column',
        title: 'Function Wrapping Column in WHERE',
        message: `Using a function like ${found} on a column in a WHERE clause prevents the database from using an index on that column.`,
        suggestion: 'Rewrite the condition to avoid wrapping the column in a function. For example, use range conditions instead of YEAR(col) = 2024.',
      };
    }
    return null;
  },
};

function findFunctionOnColumn(expr: any): string | null {
  if (!expr) return null;

  if (expr.type === 'function' || expr.type === 'aggr_func') {
    // Check if any argument is a column_ref
    const args = expr.args?.value || expr.args?.expr;
    if (args) {
      const argList = Array.isArray(args) ? args : [args];
      for (const arg of argList) {
        if (arg?.type === 'column_ref') {
          return `${expr.name || 'FUNCTION'}()`;
        }
      }
    }
  }

  if (expr.type === 'binary_expr') {
    return findFunctionOnColumn(expr.left) || findFunctionOnColumn(expr.right);
  }

  return null;
}

export const likeLeadingWildcardRule: Rule = {
  id: 'like-leading-wildcard',
  name: 'LIKE with Leading Wildcard',
  severity: 'warning',
  check(ast) {
    if (!ast.where) return null;

    if (hasLeadingWildcard(ast.where)) {
      return {
        severity: 'warning',
        rule: 'like-leading-wildcard',
        title: 'Leading Wildcard in LIKE',
        message: "Using LIKE with a leading wildcard (e.g., '%value') prevents the database from using an index and forces a full table scan.",
        suggestion: 'If possible, restructure the query to use a trailing wildcard only, or consider full-text search for pattern matching.',
      };
    }
    return null;
  },
};

function hasLeadingWildcard(expr: any): boolean {
  if (!expr) return false;

  if (expr.type === 'binary_expr' && expr.operator === 'LIKE') {
    const right = expr.right;
    if (right?.type === 'single_quote_string' || right?.type === 'string') {
      const val = right.value || '';
      if (val.startsWith('%')) return true;
    }
  }

  if (expr.type === 'binary_expr') {
    return hasLeadingWildcard(expr.left) || hasLeadingWildcard(expr.right);
  }

  return false;
}

export const missingLimitRule: Rule = {
  id: 'missing-limit',
  name: 'Missing LIMIT',
  severity: 'info',
  check(ast) {
    if (ast.type?.toUpperCase() !== 'SELECT') return null;
    if (ast.limit) return null;

    // Only warn if there are no aggregations (aggregate queries naturally return few rows)
    const hasAgg = Array.isArray(ast.columns) && ast.columns.some(
      (c: any) => c.expr?.type === 'aggr_func'
    );
    if (hasAgg && ast.groupby) return null;

    // Only warn if no GROUP BY without aggregation
    if (hasAgg && !ast.groupby) return null;

    return {
      severity: 'info',
      rule: 'missing-limit',
      title: 'No LIMIT Clause',
      message: 'This SELECT query has no LIMIT clause and may return a very large result set.',
      suggestion: 'Add a LIMIT clause to restrict the number of rows returned, especially in application code.',
    };
  },
};

export const cartesianProductRule: Rule = {
  id: 'cartesian-product',
  name: 'Cartesian Product',
  severity: 'critical',
  check(ast) {
    if (!ast.from || !Array.isArray(ast.from)) return null;

    const tablesWithoutJoin = ast.from.filter((f: any) => !f.join && f.table);
    if (tablesWithoutJoin.length <= 1) return null;

    // Check if WHERE clause connects all the tables
    if (!ast.where) {
      return {
        severity: 'critical',
        rule: 'cartesian-product',
        title: 'Possible Cartesian Product',
        message: 'Multiple tables are referenced without any join condition, which produces a cross join of all rows.',
        suggestion: 'Add proper JOIN conditions or WHERE clause conditions to connect the tables.',
      };
    }

    return null;
  },
};

export const redundantDistinctRule: Rule = {
  id: 'redundant-distinct',
  name: 'Potentially Redundant DISTINCT',
  severity: 'info',
  check(ast) {
    if (!ast.distinct) return null;
    if (ast.type?.toUpperCase() !== 'SELECT') return null;

    // If there's a GROUP BY, DISTINCT is usually redundant
    if (ast.groupby) {
      return {
        severity: 'info',
        rule: 'redundant-distinct',
        title: 'DISTINCT with GROUP BY',
        message: 'Using DISTINCT together with GROUP BY is usually redundant since GROUP BY already produces unique groups.',
        suggestion: 'Remove the DISTINCT keyword if the GROUP BY already guarantees unique results.',
      };
    }

    return null;
  },
};

export const orConditionRule: Rule = {
  id: 'or-vs-union',
  name: 'OR Conditions',
  severity: 'info',
  check(ast) {
    if (!ast.where) return null;

    const orCount = countOrConditions(ast.where);
    if (orCount >= 3) {
      return {
        severity: 'info',
        rule: 'or-vs-union',
        title: 'Multiple OR Conditions',
        message: `This query has ${orCount} OR conditions which may prevent efficient index usage.`,
        suggestion: 'Consider rewriting using UNION ALL for each OR branch, or using IN() for values on the same column.',
      };
    }
    return null;
  },
};

function countOrConditions(expr: any): number {
  if (!expr) return 0;
  if (expr.type === 'binary_expr' && expr.operator === 'OR') {
    return 1 + countOrConditions(expr.left) + countOrConditions(expr.right);
  }
  return 0;
}

export const negationInWhereRule: Rule = {
  id: 'negation-in-where',
  name: 'Negation in WHERE',
  severity: 'info',
  check(ast) {
    if (!ast.where) return null;

    if (hasNegation(ast.where)) {
      return {
        severity: 'info',
        rule: 'negation-in-where',
        title: 'Negation Operator in WHERE',
        message: 'Using NOT IN, <>, or != in WHERE clauses often prevents the optimizer from using indexes efficiently.',
        suggestion: 'Where possible, rewrite conditions to use positive comparisons, or ensure appropriate indexes exist.',
      };
    }
    return null;
  },
};

function hasNegation(expr: any): boolean {
  if (!expr) return false;

  if (expr.type === 'binary_expr') {
    if (['!=', '<>', 'NOT IN', 'NOT LIKE', 'NOT BETWEEN'].includes(expr.operator)) {
      return true;
    }
    return hasNegation(expr.left) || hasNegation(expr.right);
  }

  return false;
}

export const orderWithoutIndexRule: Rule = {
  id: 'order-without-limit',
  name: 'ORDER BY on Large Result',
  severity: 'info',
  check(ast) {
    if (!ast.orderby) return null;
    if (ast.type?.toUpperCase() !== 'SELECT') return null;

    // If there's ORDER BY but no LIMIT and no GROUP BY, sorting could be expensive
    if (!ast.limit && !ast.groupby) {
      return {
        severity: 'info',
        rule: 'order-without-limit',
        title: 'ORDER BY Without LIMIT',
        message: 'Sorting the entire result set without a LIMIT can be expensive for large tables.',
        suggestion: 'Add a LIMIT clause if you only need the top/bottom N rows, or ensure an index supports the sort order.',
      };
    }
    return null;
  },
};

// ─── Rule Registry ─────────────────────────────────────────────────

export const allRules: Rule[] = [
  selectStarRule,
  missingWhereRule,
  implicitJoinRule,
  subqueryInSelectRule,
  functionOnColumnRule,
  likeLeadingWildcardRule,
  missingLimitRule,
  cartesianProductRule,
  redundantDistinctRule,
  orConditionRule,
  negationInWhereRule,
  orderWithoutIndexRule,
];
