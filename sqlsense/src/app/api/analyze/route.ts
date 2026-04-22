import { NextRequest, NextResponse } from 'next/server';
import { parseSQL } from '@/lib/parser';
import { parseSchema } from '@/lib/schema-parser';
import { explain } from '@/lib/explainer';
import { optimize } from '@/lib/optimizer';
import { suggestIndexes } from '@/lib/indexer';
import { summarize } from '@/lib/summarizer';
import { generateVisualization } from '@/lib/visualizer';
import type { AnalyzeRequest, AnalyzeResponse, AnalyzeErrorResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const startTime = performance.now();

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
    } catch (err: any) {
      const message = err?.message || 'Failed to parse SQL query.';
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
      },
    };

    return NextResponse.json(response);
  } catch (err: any) {
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
