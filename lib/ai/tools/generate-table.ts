import { z } from 'zod';
import { tool } from 'ai';

// Schema for table column definition
const TableColumnSchema = z.object({
  key: z.string().describe('The key/accessor for the column data'),
  header: z.string().describe('The display name for the column header'),
  type: z.enum(['text', 'number', 'date', 'boolean', 'currency', 'percentage']).describe('The data type for formatting'),
  sortable: z.boolean().default(true).describe('Whether this column should be sortable'),
  filterable: z.boolean().default(false).describe('Whether this column should be filterable'),
  width: z.string().optional().describe('CSS width for the column (e.g., "200px", "20%")'),
});

// Schema for table row data
const TableRowSchema = z.record(z.any()).describe('Row data as key-value pairs matching column keys');

// Main schema for the table generation tool
const GenerateTableSchema = z.object({
  title: z.string().describe('Title for the table'),
  description: z.string().optional().describe('Optional description for the table'),
  columns: z.array(TableColumnSchema).describe('Array of column definitions'),
  data: z.array(TableRowSchema).describe('Array of row data'),
  searchKey: z.string().optional().describe('Column key to enable search/filtering on'),
  enableRowSelection: z.boolean().default(false).describe('Whether to enable row selection'),
  pageSize: z.number().default(10).describe('Number of rows per page'),
});

export const generateTableTool = tool({
  description: `Generate an interactive data table with sorting, filtering, and pagination capabilities. 
  This tool creates a professional data table component that users can interact with.
  
  Use this tool when you need to:
  - Display structured data in a tabular format
  - Create interactive tables with sorting and filtering
  - Present data analysis results
  - Show database query results
  - Display any structured information that benefits from table presentation
  
  The generated table will include:
  - Sortable columns (click headers to sort)
  - Optional search/filtering
  - Pagination controls
  - Column visibility toggles
  - Optional row selection
  - Responsive design
  
  Data types supported:
  - text: Plain text display
  - number: Formatted numbers
  - date: Formatted dates
  - boolean: Yes/No or checkmarks
  - currency: Formatted as currency ($1,234.56)
  - percentage: Formatted as percentage (12.34%)`,
  
  parameters: GenerateTableSchema,
  
  execute: async ({ title, description, columns, data, searchKey, enableRowSelection, pageSize }) => {
    // Validate that all data rows have keys matching the column definitions
    const columnKeys = columns.map(col => col.key);
    const invalidRows = data.filter(row => {
      const rowKeys = Object.keys(row);
      return !columnKeys.every(key => rowKeys.includes(key));
    });
    
    if (invalidRows.length > 0) {
      throw new Error(`Some data rows are missing required columns. Expected columns: ${columnKeys.join(', ')}`);
    }
    
    // Generate a unique table ID for this instance
    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Return the table configuration that will be used by the frontend
    return {
      type: 'table',
      tableId,
      config: {
        title,
        description,
        columns,
        data,
        searchKey,
        enableRowSelection,
        pageSize,
      },
      message: `Generated interactive table "${title}" with ${data.length} rows and ${columns.length} columns.`,
    };
  },
});

export type TableConfig = {
  title: string;
  description?: string;
  columns: Array<{
    key: string;
    header: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
    sortable: boolean;
    filterable: boolean;
    width?: string;
  }>;
  data: Array<Record<string, any>>;
  searchKey?: string;
  enableRowSelection: boolean;
  pageSize: number;
}; 