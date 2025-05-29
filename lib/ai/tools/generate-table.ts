import { z } from 'zod';
import { tool } from 'ai';

// Schema for table column definition
const TableColumnSchema = z.object({
  key: z.string().describe('The key to access data for this column'),
  header: z.string().describe('Display name for the column header'),
  type: z.enum(['text', 'number', 'currency', 'percentage', 'date', 'boolean']).describe('Data type for proper formatting'),
  sortable: z.boolean().default(true).describe('Whether this column can be sorted'),
  filterable: z.boolean().default(false).describe('Whether this column can be filtered'),
  width: z.string().optional().describe('CSS width for the column (e.g., "200px", "20%")'),
});

// Schema for table row data
const TableRowSchema = z.record(z.any()).describe('Row data as key-value pairs matching column keys');

// Main schema for the table generation tool
const GenerateTableSchema = z.object({
  title: z.string().describe('Title for the table'),
  description: z.string().optional().describe('Optional description of what the table shows'),
  columns: z.array(TableColumnSchema).describe('Column definitions for the table'),
  data: z.array(TableRowSchema).describe('Array of data objects to display in the table'),
  searchColumn: z.string().optional().describe('Column key to enable search/filtering on'),
  pageSize: z.number().default(10).describe('Number of rows per page'),
  enableRowSelection: z.boolean().default(false).describe('Whether to allow row selection'),
});

export const generateTableTool = tool({
  description: 'Generate an interactive data table with sorting, filtering, and pagination capabilities',
  parameters: GenerateTableSchema,
  execute: async (params) => {
    console.log('🔥 GENERATE TABLE TOOL CALLED!');
    console.log('📊 Table params received:', JSON.stringify(params, null, 2));
    console.log('📋 Title:', params.title);
    console.log('📝 Description:', params.description);
    console.log('🏛️ Columns count:', params.columns?.length);
    console.log('📊 Data rows count:', params.data?.length);
    
    try {
      // Validate that we have the required data
      if (!params.columns || params.columns.length === 0) {
        console.error('❌ No columns provided to generateTable');
        throw new Error('No columns provided');
      }
      
      if (!params.data || params.data.length === 0) {
        console.error('❌ No data provided to generateTable');
        throw new Error('No data provided');
      }
      
      console.log('✅ Table validation passed');
      console.log('🏗️ Generating table with:');
      console.log('  - Title:', params.title);
      console.log('  - Columns:', params.columns.map(c => `${c.header} (${c.type})`).join(', '));
      console.log('  - Rows:', params.data.length);
      console.log('  - Page size:', params.pageSize);
      console.log('  - Search column:', params.searchColumn);
      
      const result = {
        type: 'table' as const,
        title: params.title,
        description: params.description,
        columns: params.columns,
        data: params.data,
        searchColumn: params.searchColumn,
        pageSize: params.pageSize,
        enableRowSelection: params.enableRowSelection,
        timestamp: new Date().toISOString(),
      };
      
      console.log('🎉 Table generation successful!');
      console.log('📤 Returning table result:', JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('💥 Error in generateTable tool:', error);
      console.error('📊 Failed params:', JSON.stringify(params, null, 2));
      throw error;
    }
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