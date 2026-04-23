import { NextRequest, NextResponse } from 'next/server';
import { parseSQL } from '@/lib/parser';
import { parseSchema } from '@/lib/schema-parser';
import { explain } from '@/lib/explainer';
import { optimize } from '@/lib/optimizer';
import { suggestIndexes } from '@/lib/indexer';
import { summarize } from '@/lib/summarizer';
import { generateVisualization } from '@/lib/visualizer';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeErrorResponse,
  CoachingMeta,
  ChallengeMeta,
  QuerySummary,
  OptimizationResult,
} from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.sql || typeof body.sql !== 'string') {
      return NextResponse.json<AnalyzeErrorResponse>(
        {
          success: false,
          error: {
            code: 'MISSING_SQL',
            message: 'Please provide an SQL query to analyze.',
          },
        },
        { status: 400 }
      );
    }

    const sql = body.sql.trim();
    if (sql.length === 0) {
      return NextResponse.json<AnalyzeErrorResponse>(
        {
          success: false,
          error: {
            code: 'EMPTY_SQL',
            message: 'The SQL query is empty.',
          },
        },
        { status: 400 }
      );
    }

    if (sql.length > 50000) {
      return NextResponse.json<AnalyzeErrorResponse>(
        {
          success: false,
          error: {
            code: 'SQL_TOO_LONG',
            message: 'SQL query exceeds the maximum length of 50,000 characters.',
          },
        },
        { status: 400 }
      );
    }

    const dialect = body.dialect || 'mysql';

    // Parse SQL
    const parseStart = performance.now();
    let parsed;
    try {
      parsed = parseSQL(sql, dialect);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse SQL query.';
      // Try to extract helpful info from the error
      const suggestion = extractParseSuggestion(message);

      return NextResponse.json<AnalyzeErrorResponse>(
        {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: `SQL Syntax Error: ${message}`,
            suggestion,
          },
        },
        { status: 400 }
      );
    }
    const parseTimeMs = Math.round(performance.now() - parseStart);

    // Parse schema DDL if provided
    let schema;
    if (body.schema && body.schema.trim()) {
      try {
        schema = parseSchema(body.schema);
      } catch {
        // Schema parse failure is non-fatal — continue without it
      }
    }

    // Run analysis engines
    const analyzeStart = performance.now();

    const explanation = explain(parsed.ast);
    const optimization = optimize(parsed.ast, schema);
    const indexes = suggestIndexes(parsed.ast, schema);
    const summary = summarize(parsed.ast);
    const visualization = generateVisualization(summary, schema);

    const analyzeTimeMs = Math.round(performance.now() - analyzeStart);

    const coaching = buildCoachingMeta(optimization);
    const challenge = buildChallengeMeta(summary, optimization);

    const response: AnalyzeResponse = {
      success: true,
      data: {
        explanation,
        optimization,
        indexes,
        summary,
        visualization,
      },
      meta: {
        parseTimeMs,
        analyzeTimeMs,
        dialect,
        coaching,
        challenge,
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('Analyze API error:', err);
    return NextResponse.json<AnalyzeErrorResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during analysis.',
        },
      },
      { status: 500 }
    );
  }
}

function buildCoachingMeta(optimization: OptimizationResult): CoachingMeta {
  const confidence = Math.max(1, Math.min(100, optimization.score));
  const nudges = optimization.hints.slice(0, 3).map((hint) => hint.suggestion);
  const improvePrompt = optimization.hints.length > 0
    ? `Try improving "${optimization.hints[0].title}" and rerun analysis.`
    : 'Great job. Try rewriting with explicit column selections for readability.';

  return { confidence, nudges, improvePrompt };
}

function buildChallengeMeta(summary: QuerySummary, optimization: OptimizationResult): ChallengeMeta {
  let estimatedDifficulty: ChallengeMeta['estimatedDifficulty'] = 'easy';

  if (summary.joins.length >= 2 || summary.subqueries > 0 || optimization.hints.length >= 3) {
    estimatedDifficulty = 'medium';
  }
  if (summary.subqueries > 1 || summary.joins.length >= 4 || optimization.score < 45) {
    estimatedDifficulty = 'hard';
  }

  return { estimatedDifficulty };
}

function extractParseSuggestion(message: string): string | undefined {
  // Common typos
  const typoMap: Record<string, string> = {
    'FORM': 'FROM',
    'SLEECT': 'SELECT',
    'SLECT': 'SELECT',
    'WEHRE': 'WHERE',
    'WHER': 'WHERE',
    'GRUOP': 'GROUP',
    'ODRDER': 'ORDER',
    'JION': 'JOIN',
    'LIMT': 'LIMIT',
    'DELET': 'DELETE',
    'UDPATE': 'UPDATE',
    'INSRET': 'INSERT',
  };

  for (const [typo, correct] of Object.entries(typoMap)) {
    if (message.toUpperCase().includes(typo)) {
      return `Did you mean '${correct}'?`;
    }
  }

  if (message.includes('Unexpected')) {
    return 'Check for missing commas, parentheses, or keywords near the reported position.';
  }

  return undefined;
}
