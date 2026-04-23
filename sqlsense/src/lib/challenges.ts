import type { Challenge, LearningPath } from '@/lib/types';

const CAMPUS_SCHEMA = `CREATE TABLE candidates (
  candidate_id INT PRIMARY KEY,
  full_name VARCHAR(120),
  email VARCHAR(180),
  department VARCHAR(80),
  graduation_year INT
);

CREATE TABLE assessment_results (
  result_id INT PRIMARY KEY,
  candidate_id INT,
  round_name VARCHAR(80),
  score INT,
  attempted_at TIMESTAMP,
  status VARCHAR(30)
);

CREATE TABLE interview_feedback (
  feedback_id INT PRIMARY KEY,
  candidate_id INT,
  interviewer VARCHAR(120),
  round_name VARCHAR(80),
  rating DECIMAL(4,2),
  feedback_status VARCHAR(30),
  created_at TIMESTAMP
);

CREATE TABLE offers (
  offer_id INT PRIMARY KEY,
  candidate_id INT,
  offered_ctc DECIMAL(10,2),
  offer_status VARCHAR(30),
  offered_on DATE
);`;

type Difficulty = Challenge['difficulty'];

interface ChallengeTemplate {
  titleSuffix: string;
  description: string;
  objective: string;
  starterSql: string;
  expectedPatterns: string[];
  forbiddenPatterns?: string[];
  hints: string[];
  difficulty: Difficulty;
  timeLimitSec: number;
}

function formatId(index: number): string {
  return `ch-${String(index).padStart(3, '0')}`;
}

function buildSeries(
  startIndex: number,
  category: Challenge['category'],
  themes: string[],
  templates: ChallengeTemplate[],
  schema?: string
): Challenge[] {
  const challenges: Challenge[] = [];
  let index = startIndex;

  for (const theme of themes) {
    for (const template of templates) {
      challenges.push({
        id: formatId(index),
        title: `${theme}: ${template.titleSuffix}`,
        description: template.description.replace('{theme}', theme),
        objective: template.objective,
        difficulty: template.difficulty,
        category,
        starterSql: template.starterSql,
        expectedPatterns: template.expectedPatterns,
        forbiddenPatterns: template.forbiddenPatterns,
        hints: template.hints,
        timeLimitSec: template.timeLimitSec,
        schema,
      });
      index += 1;
    }
  }

  return challenges;
}

const CORE_CHALLENGES: Challenge[] = [
  {
    id: 'ch-001',
    title: 'Campus Top Scorers',
    description: 'Get top students by score from CSE branch only.',
    objective: 'Use filtering + sorting + limit efficiently.',
    difficulty: 'easy',
    category: 'beginner',
    starterSql: 'SELECT * FROM students;',
    expectedPatterns: ['select', 'from students', 'where', 'order by', 'limit'],
    forbiddenPatterns: ['select *'],
    hints: [
      'Avoid SELECT * and only choose required columns.',
      'Filter branch with WHERE branch = ...',
      'Sort descending by score and add LIMIT for top rows.',
    ],
    timeLimitSec: 180,
    schema: `CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  branch VARCHAR(20),
  score INT,
  semester INT
);`,
  },
  {
    id: 'ch-002',
    title: 'Hostel Fee Defaulters',
    description: 'Find students who have pending fee and payment older than 30 days.',
    objective: 'Write a clean join with proper filters.',
    difficulty: 'medium',
    category: 'interview',
    starterSql: 'SELECT s.name FROM students s JOIN payments p ON s.id = p.student_id;',
    expectedPatterns: ['join', 'where', 'pending', 'date'],
    forbiddenPatterns: ['cartesian'],
    hints: [
      'Use JOIN with an explicit ON condition.',
      'Filter pending records in WHERE.',
      'Apply date logic using current date comparison per dialect.',
    ],
    timeLimitSec: 300,
  },
  {
    id: 'ch-003',
    title: 'Department Performance Dashboard',
    description: 'Generate average score per department for dashboard cards.',
    objective: 'Use aggregate + grouping with readable output.',
    difficulty: 'hard',
    category: 'power',
    starterSql: 'SELECT branch, AVG(score) FROM students GROUP BY branch;',
    expectedPatterns: ['avg', 'group by', 'order by'],
    forbiddenPatterns: ['select *'],
    hints: [
      'Add aliases to make result readable.',
      'Sort departments by average score.',
      'Keep aggregate query minimal and index-friendly.',
    ],
    timeLimitSec: 420,
  },
];

const INTERVIEW_THEMES = [
  'Aptitude Round',
  'Coding Round',
  'Group Discussion Screening',
  'Technical Interview Stage',
  'HR Evaluation Stage',
  'Offer Rollout Tracker',
  'Shortlist Pipeline',
  'Referral Candidate Review',
  'Off-Campus Drive Analytics',
  'Internship Conversion Funnel',
];

const INTERVIEW_TEMPLATES: ChallengeTemplate[] = [
  {
    titleSuffix: 'Top N Shortlist',
    description: 'Build a ranked shortlist for {theme} by strongest score.',
    objective: 'Filter, sort, and limit with interview-ready SQL style.',
    starterSql: 'SELECT candidate_id, score FROM assessment_results ORDER BY score DESC;',
    expectedPatterns: ['select', 'from', 'order by', 'limit'],
    forbiddenPatterns: ['select *'],
    hints: [
      'Select only required fields.',
      'Keep ordering by score descending.',
      'Use LIMIT for shortlist size.',
    ],
    difficulty: 'medium',
    timeLimitSec: 260,
  },
  {
    titleSuffix: 'Round Join Validation',
    description: 'Join candidate master data with {theme} performance records.',
    objective: 'Write explicit joins and avoid accidental cartesian products.',
    starterSql: 'SELECT c.full_name, a.round_name, a.score FROM candidates c JOIN assessment_results a ON c.candidate_id = a.candidate_id;',
    expectedPatterns: ['join', 'on', 'where'],
    forbiddenPatterns: ['cross join'],
    hints: [
      'Always use explicit JOIN ... ON.',
      'Add WHERE to scope to one round/status.',
      'Return candidate identifiers for traceability.',
    ],
    difficulty: 'medium',
    timeLimitSec: 320,
  },
  {
    titleSuffix: 'Duplicate Profile Detection',
    description: 'Detect duplicate candidate profiles in {theme}.',
    objective: 'Use grouping + having for duplicate detection patterns.',
    starterSql: 'SELECT email, COUNT(*) AS duplicates FROM candidates GROUP BY email HAVING COUNT(*) > 1;',
    expectedPatterns: ['group by', 'having', 'count'],
    forbiddenPatterns: ['select *'],
    hints: [
      'Group on natural identity fields (email/phone).',
      'Use HAVING for aggregate filters.',
      'Alias aggregate output for readability.',
    ],
    difficulty: 'medium',
    timeLimitSec: 300,
  },
  {
    titleSuffix: 'Better Than Average Filter',
    description: 'Find candidates in {theme} scoring above round average.',
    objective: 'Practice correlated/non-correlated subquery interview patterns.',
    starterSql: 'SELECT candidate_id, score FROM assessment_results WHERE score > (SELECT AVG(score) FROM assessment_results);',
    expectedPatterns: ['where', '(select', 'avg('],
    hints: [
      'Use a scalar subquery in WHERE.',
      'Ensure comparison uses same metric.',
      'Consider round-level filtering for fairness.',
    ],
    difficulty: 'hard',
    timeLimitSec: 360,
  },
  {
    titleSuffix: 'Window Rank Panel',
    description: 'Rank candidates in {theme} by score per department.',
    objective: 'Use window functions for modern placement analytics.',
    starterSql: 'SELECT c.department, a.candidate_id, a.score, DENSE_RANK() OVER (PARTITION BY c.department ORDER BY a.score DESC) AS dept_rank FROM assessment_results a JOIN candidates c ON c.candidate_id = a.candidate_id;',
    expectedPatterns: ['over', 'partition by', 'order by'],
    hints: [
      'Partition ranking by department.',
      'Use DENSE_RANK for interview discussion clarity.',
      'Order score descending inside the window.',
    ],
    difficulty: 'hard',
    timeLimitSec: 420,
  },
  {
    titleSuffix: 'Offer Acceptance KPI',
    description: 'Compute offer acceptance KPI for {theme}.',
    objective: 'Use conditional aggregation for business interview cases.',
    starterSql: "SELECT ROUND(100.0 * AVG(CASE WHEN offer_status = 'ACCEPTED' THEN 1 ELSE 0 END), 2) AS acceptance_rate FROM offers;",
    expectedPatterns: ['case when', 'avg', 'round'],
    hints: [
      'Encode status to 1/0 with CASE.',
      'Aggregate over population for conversion rate.',
      'Round the final KPI output.',
    ],
    difficulty: 'hard',
    timeLimitSec: 380,
  },
  {
    titleSuffix: 'Missing Feedback Audit',
    description: 'List candidates in {theme} without completed interview feedback.',
    objective: 'Use anti-join style filters with null checks.',
    starterSql: "SELECT c.candidate_id, c.full_name FROM candidates c LEFT JOIN interview_feedback f ON c.candidate_id = f.candidate_id AND f.feedback_status = 'COMPLETED' WHERE f.feedback_id IS NULL;",
    expectedPatterns: ['left join', 'is null', 'where'],
    hints: [
      'Push completed status inside JOIN condition.',
      'Use IS NULL filter on right table key.',
      'Return candidate identifiers for follow-up.',
    ],
    difficulty: 'medium',
    timeLimitSec: 330,
  },
  {
    titleSuffix: 'Safe Status Update',
    description: 'Perform scoped update for {theme} without accidental bulk writes.',
    objective: 'Practice UPDATE with mandatory WHERE safety.',
    starterSql: "UPDATE assessment_results SET status = 'SHORTLISTED' WHERE score >= 85 AND round_name = 'Coding Round';",
    expectedPatterns: ['update', 'set', 'where'],
    forbiddenPatterns: ['where 1=1', 'where true'],
    hints: [
      'Always include a strict WHERE clause.',
      'Filter by both score and round context.',
      'Preview target rows with SELECT before UPDATE.',
    ],
    difficulty: 'hard',
    timeLimitSec: 260,
  },
];

const BEGINNER_THEMES = [
  'SQL Basics Sprint',
  'Freshers Onboarding',
  'Campus Dashboard Intro',
  'Attendance Insights',
  'Course Analytics',
  'Library Usage Tracker',
  'Event Participation Report',
  'Simple Hiring Data Lab',
];

const BEGINNER_TEMPLATES: ChallengeTemplate[] = [
  {
    titleSuffix: 'Selective Columns Only',
    description: 'Return only required columns for {theme}.',
    objective: 'Build a habit of avoiding SELECT * in real systems.',
    starterSql: 'SELECT * FROM candidates;',
    expectedPatterns: ['select', 'from candidates'],
    forbiddenPatterns: ['select *'],
    hints: [
      'Choose only columns needed by UI/report.',
      'Use clear aliases for display-friendly output.',
      'Keep result width small for speed.',
    ],
    difficulty: 'easy',
    timeLimitSec: 170,
  },
  {
    titleSuffix: 'Filter + Sort Fundamentals',
    description: 'Filter and sort records for {theme}.',
    objective: 'Practice WHERE + ORDER BY in one clean query.',
    starterSql: 'SELECT candidate_id, full_name, department FROM candidates WHERE graduation_year = 2026 ORDER BY full_name;',
    expectedPatterns: ['where', 'order by'],
    hints: [
      'Start with a clear WHERE filter.',
      'Sort by business-friendly field.',
      'Use ASC/DESC explicitly for readability.',
    ],
    difficulty: 'easy',
    timeLimitSec: 180,
  },
  {
    titleSuffix: 'Group Count Snapshot',
    description: 'Create grouped counts for {theme}.',
    objective: 'Use COUNT + GROUP BY for first analytics use-case.',
    starterSql: 'SELECT department, COUNT(*) AS total_candidates FROM candidates GROUP BY department ORDER BY total_candidates DESC;',
    expectedPatterns: ['count', 'group by', 'order by'],
    hints: [
      'Alias aggregate columns with meaningful names.',
      'Group only on required dimension fields.',
      'Sort output to highlight top groups.',
    ],
    difficulty: 'easy',
    timeLimitSec: 220,
  },
  {
    titleSuffix: 'Simple Join Intro',
    description: 'Join profile and result data for {theme}.',
    objective: 'Understand one-to-many join and selected output.',
    starterSql: 'SELECT c.full_name, a.round_name, a.score FROM candidates c JOIN assessment_results a ON c.candidate_id = a.candidate_id WHERE a.score >= 70;',
    expectedPatterns: ['join', 'on', 'where'],
    hints: [
      'Use table aliases to keep query short.',
      'Join on key columns only.',
      'Add score filter for meaningful subset.',
    ],
    difficulty: 'medium',
    timeLimitSec: 260,
  },
];

const POWER_THEMES = [
  'Advanced Query Tuning',
  'Placement Data Engineering',
  'Interview Analytics Dashboard',
  'Executive Hiring Insights',
  'Offer Pipeline Intelligence',
  'Cross-Round Performance Modeling',
];

const POWER_TEMPLATES: ChallengeTemplate[] = [
  {
    titleSuffix: 'CTE Pipeline Build',
    description: 'Build a reusable shortlist pipeline for {theme}.',
    objective: 'Use WITH CTE blocks for composable SQL.',
    starterSql: "WITH latest_scores AS (SELECT candidate_id, MAX(score) AS best_score FROM assessment_results GROUP BY candidate_id) SELECT c.candidate_id, c.full_name, l.best_score FROM candidates c JOIN latest_scores l ON c.candidate_id = l.candidate_id WHERE l.best_score >= 80 ORDER BY l.best_score DESC;",
    expectedPatterns: ['with', 'group by', 'join', 'order by'],
    hints: [
      'Use CTE to isolate reusable logic.',
      'Aggregate before joining to reduce rows.',
      'Apply final filtering in outer query.',
    ],
    difficulty: 'hard',
    timeLimitSec: 420,
  },
  {
    titleSuffix: 'Window Trend Analysis',
    description: 'Track round-over-round change for {theme}.',
    objective: 'Use LAG/LEAD or window aggregates for trend analysis.',
    starterSql: 'SELECT candidate_id, attempted_at, score, LAG(score) OVER (PARTITION BY candidate_id ORDER BY attempted_at) AS prev_score FROM assessment_results;',
    expectedPatterns: ['lag', 'over', 'partition by', 'order by'],
    hints: [
      'Partition by entity, order by time.',
      'Compare current vs previous metric.',
      'Filter null lag values if needed for KPI.',
    ],
    difficulty: 'hard',
    timeLimitSec: 460,
  },
  {
    titleSuffix: 'Conditional KPI Matrix',
    description: 'Build conditional KPI matrix for {theme}.',
    objective: 'Use multiple CASE aggregates in one query.',
    starterSql: "SELECT department, COUNT(*) AS total, SUM(CASE WHEN score >= 85 THEN 1 ELSE 0 END) AS high_performers, SUM(CASE WHEN score BETWEEN 70 AND 84 THEN 1 ELSE 0 END) AS medium_performers FROM candidates c JOIN assessment_results a ON c.candidate_id = a.candidate_id GROUP BY department;",
    expectedPatterns: ['case when', 'sum', 'group by', 'join'],
    hints: [
      'Use CASE buckets for segmentation.',
      'Keep bucket ranges mutually exclusive.',
      'Aggregate after correct joins only.',
    ],
    difficulty: 'hard',
    timeLimitSec: 430,
  },
  {
    titleSuffix: 'Correlated Risk Flags',
    description: 'Flag outlier candidates in {theme} using correlated checks.',
    objective: 'Practice correlated subqueries and threshold logic.',
    starterSql: 'SELECT a.candidate_id, a.score FROM assessment_results a WHERE a.score < (SELECT AVG(a2.score) FROM assessment_results a2 WHERE a2.round_name = a.round_name);',
    expectedPatterns: ['where', '(select', 'avg('],
    hints: [
      'Correlate subquery by the same round dimension.',
      'Compare row metric with grouped benchmark.',
      'Add candidate details with JOIN if needed.',
    ],
    difficulty: 'hard',
    timeLimitSec: 440,
  },
];

const GENERATED_INTERVIEW = buildSeries(4, 'interview', INTERVIEW_THEMES, INTERVIEW_TEMPLATES, CAMPUS_SCHEMA);
const GENERATED_BEGINNER = buildSeries(4 + GENERATED_INTERVIEW.length, 'beginner', BEGINNER_THEMES, BEGINNER_TEMPLATES, CAMPUS_SCHEMA);
const GENERATED_POWER = buildSeries(
  4 + GENERATED_INTERVIEW.length + GENERATED_BEGINNER.length,
  'power',
  POWER_THEMES,
  POWER_TEMPLATES,
  CAMPUS_SCHEMA
);

export const CHALLENGES: Challenge[] = [
  ...CORE_CHALLENGES,
  ...GENERATED_INTERVIEW,
  ...GENERATED_BEGINNER,
  ...GENERATED_POWER,
];

const beginnerIds = CHALLENGES.filter((challenge) => challenge.category === 'beginner').map((challenge) => challenge.id);
const interviewIds = CHALLENGES.filter((challenge) => challenge.category === 'interview').map((challenge) => challenge.id);
const powerIds = CHALLENGES.filter((challenge) => challenge.category === 'power').map((challenge) => challenge.id);

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'beginner',
    title: 'Beginner Boost',
    subtitle: 'Core query habits for first-year learners',
    challengeIds: beginnerIds,
  },
  {
    id: 'interview',
    title: 'Placement Prep',
    subtitle: 'Interview-style joins, analytics, and problem solving',
    challengeIds: interviewIds,
  },
  {
    id: 'power',
    title: 'Power User Sprint',
    subtitle: 'Advanced SQL patterns for analytics and optimization',
    challengeIds: powerIds,
  },
];

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}
