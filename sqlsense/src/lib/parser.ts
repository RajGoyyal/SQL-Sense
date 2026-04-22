import { Parser } from 'node-sql-parser';

/**
 * Parse an SQL query into an AST using node-sql-parser.
 * Returns the AST, referenced tables, and referenced columns.
 */
export function parseSQL(sql: string, dialect: string = 'mysql') {
  const parser = new Parser();
  const dbType = mapDialect(dialect);

  const ast = parser.astify(sql, { database: dbType as any });
  let tableList: string[] = [];
  let columnList: string[] = [];

  try {
    tableList = parser.tableList(sql, { database: dbType as any });
  } catch { /* non-critical */ }

  try {
    columnList = parser.columnList(sql, { database: dbType as any });
  } catch { /* non-critical */ }

  return { ast, tableList, columnList };
}

/**
 * Try to format / beautify an SQL string.
 */
export function formatSQL(sql: string, dialect: string = 'mysql'): string {
  try {
    const parser = new Parser();
    const dbType = mapDialect(dialect);
    const ast = parser.astify(sql, { database: dbType as any });
    return parser.sqlify(ast, { database: dbType as any });
  } catch {
    return sql;
  }
}

function mapDialect(dialect: string): string {
  const map: Record<string, string> = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    sqlite: 'SQLite',
    mariadb: 'MariaDB',
    transactsql: 'TransactSQL',
    tsql: 'TransactSQL',
  };
  return map[dialect.toLowerCase()] || 'MySQL';
}
