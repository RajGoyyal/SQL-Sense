import type { VisualizationData, VizNode, VizEdge, ParsedSchema, QuerySummary } from './types';

/**
 * Generate React Flow-compatible nodes and edges from schema and query summary.
 */
export function generateVisualization(
  summary: QuerySummary,
  schema?: ParsedSchema
): VisualizationData {
  const nodes: VizNode[] = [];
  const edges: VizEdge[] = [];

  if (schema && schema.tables.length > 0) {
    return generateSchemaVisualization(summary, schema);
  }

  // Fallback: generate visualization from query summary alone
  return generateQueryVisualization(summary);
}

function generateSchemaVisualization(
  summary: QuerySummary,
  schema: ParsedSchema
): VisualizationData {
  const nodes: VizNode[] = [];
  const edges: VizEdge[] = [];

  const queryTableNames = summary.tables.map(t => t.name.toLowerCase());
  const selectedColumns = summary.columns.map(c => {
    const parts = c.split('.');
    return parts.length > 1 ? { table: parts[0], column: parts[1].split(' ')[0] } : { table: '', column: parts[0].split(' ')[0] };
  });
  const filterColumns = summary.filters.flatMap(f => {
    const matches = f.match(/(\w+)\.(\w+)/g) || [];
    return matches.map(m => {
      const [t, c] = m.split('.');
      return { table: t, column: c };
    });
  });

  // Position tables in a grid
  const cols = Math.ceil(Math.sqrt(schema.tables.length));

  schema.tables.forEach((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isFromQuery = queryTableNames.includes(table.name.toLowerCase());

    // Find alias for this table
    const tableRef = summary.tables.find(t => t.name.toLowerCase() === table.name.toLowerCase());

    nodes.push({
      id: table.name,
      type: 'schemaNode',
      position: { x: col * 320, y: row * 300 },
      data: {
        label: tableRef?.alias ? `${table.name} (${tableRef.alias})` : table.name,
        columns: table.columns.map(c => ({
          name: c.name,
          type: c.type,
          isPrimary: c.isPrimary,
          isForeign: c.isForeign,
          isSelected: selectedColumns.some(
            sc => sc.column === c.name &&
              (sc.table === '' || sc.table.toLowerCase() === table.name.toLowerCase() ||
               sc.table === tableRef?.alias)
          ),
          isFiltered: filterColumns.some(
            fc => fc.column === c.name &&
              (fc.table === '' || fc.table.toLowerCase() === table.name.toLowerCase() ||
               fc.table === tableRef?.alias)
          ),
        })),
        isFromQuery,
      },
    });
  });

  // Add edges for foreign keys
  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      const sourceCol = fk.columns[0];
      const targetCol = fk.refColumns[0];

      // Check if this relationship is used in the query
      const isUsedInJoin = summary.joins.some(j =>
        (j.from.toLowerCase() === table.name.toLowerCase() || j.to.toLowerCase() === table.name.toLowerCase()) &&
        (j.from.toLowerCase() === fk.refTable.toLowerCase() || j.to.toLowerCase() === fk.refTable.toLowerCase())
      );

      edges.push({
        id: `${table.name}-${fk.refTable}-${sourceCol}`,
        source: table.name,
        target: fk.refTable,
        sourceHandle: `${table.name}-${sourceCol}`,
        targetHandle: `${fk.refTable}-${targetCol}`,
        label: `${sourceCol} → ${targetCol}`,
        type: 'smoothstep',
        animated: isUsedInJoin,
      });
    }
  }

  return { nodes, edges };
}

function generateQueryVisualization(summary: QuerySummary): VisualizationData {
  const nodes: VizNode[] = [];
  const edges: VizEdge[] = [];

  // Create nodes for each table mentioned in the query
  summary.tables.forEach((table, index) => {
    const cols = Math.ceil(Math.sqrt(summary.tables.length));
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Extract columns that belong to this table
    const tableCols = summary.columns
      .filter(c => {
        if (c === '*') return true;
        const parts = c.split('.');
        if (parts.length > 1) {
          return parts[0] === table.name || parts[0] === table.alias;
        }
        return summary.tables.length === 1;
      })
      .map(c => {
        const parts = c.split('.');
        const colName = parts.length > 1 ? parts[1].split(' ')[0] : parts[0].split(' ')[0];
        return {
          name: colName,
          type: '',
          isPrimary: false,
          isForeign: false,
          isSelected: true,
          isFiltered: false,
        };
      });

    nodes.push({
      id: table.name,
      type: 'schemaNode',
      position: { x: col * 320, y: row * 280 },
      data: {
        label: table.alias ? `${table.name} (${table.alias})` : table.name,
        columns: tableCols,
        isFromQuery: true,
      },
    });
  });

  // Add edges for joins
  for (const join of summary.joins) {
    edges.push({
      id: `${join.from}-${join.to}`,
      source: join.from,
      target: join.to,
      sourceHandle: '',
      targetHandle: '',
      label: join.type,
      type: 'smoothstep',
      animated: true,
    });
  }

  return { nodes, edges };
}
