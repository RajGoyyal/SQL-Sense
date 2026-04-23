import type { Challenge, LearningPath } from '@/lib/types';

export const CHALLENGES: Challenge[] = [
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

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'beginner',
    title: 'Beginner Boost',
    subtitle: 'Core query habits for first-year learners',
    challengeIds: ['ch-001'],
  },
  {
    id: 'interview',
    title: 'Placement Prep',
    subtitle: 'Interview-style joins and filtering tasks',
    challengeIds: ['ch-001', 'ch-002'],
  },
  {
    id: 'power',
    title: 'Power User Sprint',
    subtitle: 'Fast analytics and optimization mindset',
    challengeIds: ['ch-002', 'ch-003'],
  },
];

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}
