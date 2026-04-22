# SQLSense

> Understand, optimize, and visualize SQL queries instantly.

**SQLSense** is a free, open-source SQL analysis tool that runs entirely on Vercel's free Hobby plan. Paste a query, optionally provide schema DDL, and get instant insights — no login, no database, no paid services required.

## ✨ Features

- **📝 Plain-English Explanation** — Understand what your SQL does, step by step
- **⚡ Optimization Hints** — 12+ heuristic rules detect common anti-patterns (SELECT *, missing WHERE, cartesian products, etc.)
- **🔑 Index Suggestions** — Get actionable CREATE INDEX statements with reasoning
- **📋 Query Summary** — Structured breakdown of tables, columns, joins, filters, aggregates
- **🗺️ Schema Visualization** — Interactive ERD diagram powered by React Flow
- **🌙 Dark Mode** — Beautiful dark/light theme with system preference detection
- **📋 Copy & Export** — One-click copy for all results

## 🚀 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/sqlsense)

### Manual Deploy

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/sqlsense.git
cd sqlsense

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev

# 4. Deploy to Vercel
npx vercel deploy --prod
```

Or simply import from GitHub in the [Vercel Dashboard](https://vercel.com/new).

## 🏗️ Architecture

```
Browser                          Vercel Serverless
┌──────────────────┐            ┌──────────────────┐
│  CodeMirror       │  POST     │  /api/analyze     │
│  SQL Editor       │ ────────► │                    │
│                    │           │  SQL Parser        │
│  React Flow       │  JSON     │  Rule Engine       │
│  ERD Visualizer   │ ◄──────── │  Index Analyzer    │
└──────────────────┘            └──────────────────┘
```

- **Frontend**: Next.js 15 (App Router), React, CodeMirror 6, React Flow
- **Backend**: Single serverless API route (`/api/analyze`)
- **SQL Parsing**: `node-sql-parser` (MySQL, PostgreSQL, SQLite, MariaDB, SQL Server)
- **Styling**: Vanilla CSS with CSS variables (zero runtime cost)
- **No database, no auth, no paid services**

## 📁 Project Structure

```
src/
├── app/
│   ├── api/analyze/route.ts   # Serverless API endpoint
│   ├── globals.css             # Design system
│   ├── layout.tsx              # Root layout + metadata
│   └── page.tsx                # Main page
├── components/                 # React UI components
├── hooks/                      # Custom React hooks
└── lib/
    ├── parser.ts               # SQL parsing wrapper
    ├── schema-parser.ts        # DDL → structured schema
    ├── explainer.ts            # AST → English explanation
    ├── optimizer.ts            # Heuristic rule engine
    ├── indexer.ts              # Index suggestion engine
    ├── summarizer.ts           # Query summary extractor
    ├── visualizer.ts           # Schema → React Flow data
    ├── rules/index.ts          # 12+ optimization rules
    ├── examples.ts             # Bundled example queries
    └── types.ts                # TypeScript types
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## 📊 Optimization Rules

| Rule | Severity | Detection |
|------|----------|-----------|
| `select-star` | ⚠️ Warning | SELECT * usage |
| `missing-where` | 🔴 Critical | UPDATE/DELETE without WHERE |
| `implicit-join` | ℹ️ Info | Comma-separated table joins |
| `subquery-in-select` | ⚠️ Warning | Correlated subqueries in SELECT |
| `function-on-column` | ⚠️ Warning | Functions on columns in WHERE |
| `like-leading-wildcard` | ⚠️ Warning | LIKE '%value' patterns |
| `missing-limit` | ℹ️ Info | Large result sets without LIMIT |
| `cartesian-product` | 🔴 Critical | Missing join conditions |
| `redundant-distinct` | ℹ️ Info | DISTINCT with GROUP BY |
| `or-vs-union` | ℹ️ Info | Multiple OR conditions |
| `negation-in-where` | ℹ️ Info | NOT IN, <>, != in WHERE |
| `order-without-limit` | ℹ️ Info | ORDER BY without LIMIT |

## 🎨 Tech Stack

- **Next.js 15** — React framework with App Router
- **TypeScript** — Type-safe code
- **CodeMirror 6** — SQL editor with syntax highlighting
- **React Flow** — Interactive schema visualization
- **node-sql-parser** — Multi-dialect SQL parsing
- **Vanilla CSS** — Zero-runtime styling with CSS variables

## 📄 License

MIT — see [LICENSE](./LICENSE)

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push (`git push origin feature/my-feature`)
5. Open a Pull Request
