// ─── Request / Response ────────────────────────────────────────────

export interface AnalyzeRequest {
  sql: string;
  schema?: string;
  dialect?: SqlDialect;
}

export type SqlDialect = 'mysql' | 'postgresql' | 'sqlite' | 'mariadb' | 'transactsql';

export interface AnalyzeResponse {
  success: true;
  data: AnalysisResult;
  meta: AnalysisMeta;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

export interface AnalysisMeta {
  parseTimeMs: number;
  analyzeTimeMs: number;
  dialect: string;
  coaching?: CoachingMeta;
  challenge?: ChallengeMeta;
}

// ─── Analysis Result ───────────────────────────────────────────────

export interface AnalysisResult {
  explanation: ExplanationResult;
  optimization: OptimizationResult;
  indexes: IndexSuggestion[];
  summary: QuerySummary;
  visualization: VisualizationData;
}

export interface CoachingMeta {
  confidence: number;
  nudges: string[];
  improvePrompt: string;
}

export interface ChallengeMeta {
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
}

// ─── Explanation ───────────────────────────────────────────────────

export interface ExplanationResult {
  summary: string;
  steps: string[];
}

// ─── Optimization ──────────────────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'info';

export interface OptimizationHint {
  severity: Severity;
  rule: string;
  title: string;
  message: string;
  suggestion: string;
}

export interface OptimizationResult {
  score: number;
  hints: OptimizationHint[];
}

// ─── Rules ─────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  name: string;
  severity: Severity;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check: (ast: any, schema?: ParsedSchema) => OptimizationHint | null;
}

// ─── Index Suggestions ─────────────────────────────────────────────

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'single' | 'composite' | 'covering';
  reasoning: string;
}

// ─── Query Summary ─────────────────────────────────────────────────

export interface QuerySummary {
  queryType: string;
  tables: TableRef[];
  columns: string[];
  joins: JoinInfo[];
  filters: string[];
  groupBy: string[];
  orderBy: OrderByInfo[];
  limit: number | null;
  aggregates: string[];
  subqueries: number;
  hasDistinct: boolean;
  hasHaving: boolean;
}

export interface TableRef {
  name: string;
  alias: string | null;
}

export interface JoinInfo {
  type: string;
  from: string;
  to: string;
  on: string;
}

export interface OrderByInfo {
  expr: string;
  direction: 'ASC' | 'DESC';
}

// ─── Schema ────────────────────────────────────────────────────────

export interface ParsedSchema {
  tables: SchemaTable[];
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  defaultValue?: string;
}

export interface ForeignKey {
  columns: string[];
  refTable: string;
  refColumns: string[];
}

// ─── Visualization ─────────────────────────────────────────────────

export interface VisualizationData {
  nodes: VizNode[];
  edges: VizEdge[];
}

export interface VizNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    columns: VizColumn[];
    isFromQuery: boolean;
  };
}

export interface VizColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  isForeign: boolean;
  isSelected: boolean;
  isFiltered: boolean;
}

export interface VizEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;
  type: string;
  animated: boolean;
}

// ─── Examples ──────────────────────────────────────────────────────

export interface ExampleQuery {
  id: string;
  name: string;
  description: string;
  category: string;
  sql: string;
  schema?: string;
}

// Interactive challenge and progress model (hybrid-ready)
export interface Challenge {
  id: string;
  title: string;
  description: string;
  objective: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'beginner' | 'interview' | 'power';
  starterSql: string;
  expectedPatterns: string[];
  forbiddenPatterns?: string[];
  hints: string[];
  timeLimitSec: number;
  schema?: string;
}

export interface ChallengeAttempt {
  challengeId: string;
  sql: string;
  elapsedSec: number;
  usedHints: number;
}

export interface ChallengeEvaluation {
  score: number;
  passed: boolean;
  feedback: string[];
  nextHint?: string;
  xpEarned: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlockedAt?: number;
}

export interface WeeklyGoal {
  id: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface UserProgress {
  streakDays: number;
  xp: number;
  level: number;
  solvedCount: number;
  lastSolvedAt?: number;
  badges: Badge[];
  weeklyGoals: WeeklyGoal[];
  gamificationEnabled: boolean;
}

export interface LearningPath {
  id: 'beginner' | 'interview' | 'power';
  title: string;
  subtitle: string;
  challengeIds: string[];
}

export interface ProgressStore {
  getProgress(clientId: string): Promise<UserProgress>;
  saveProgress(clientId: string, progress: UserProgress): Promise<UserProgress>;
}
