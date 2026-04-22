import type { OptimizationResult, ParsedSchema } from './types';
import { allRules } from './rules';

/**
 * Run all optimization rules against the parsed AST and optional schema.
 * Returns a score (0-100) and list of hints.
 */
export function optimize(ast: any, schema?: ParsedSchema): OptimizationResult {
  const stmt = Array.isArray(ast) ? ast[0] : ast;
  if (!stmt) {
    return { score: 100, hints: [] };
  }

  const hints = [];

  for (const rule of allRules) {
    try {
      const result = rule.check(stmt, schema);
      if (result) {
        hints.push(result);
      }
    } catch {
      // Skip rules that error — don't break analysis
    }
  }

  // Calculate score: start at 100, deduct per hint severity
  const deductions: Record<string, number> = {
    critical: 25,
    warning: 10,
    info: 3,
  };

  let score = 100;
  for (const hint of hints) {
    score -= deductions[hint.severity] || 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    hints,
  };
}
