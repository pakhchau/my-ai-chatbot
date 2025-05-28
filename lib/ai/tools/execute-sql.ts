import { tool } from 'ai';
import { z } from 'zod';
import postgres from 'postgres';
import type { Session } from 'next-auth';

// Define allowed SQL operations for security
const ALLOWED_OPERATIONS = [
  'SELECT',
  'INSERT',
  'UPDATE', 
  'DELETE',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'CREATE INDEX',
  'DROP INDEX'
];

// Define restricted tables/operations for security
const RESTRICTED_TABLES = [
  'User', // Protect user authentication data
  'pg_', // Protect PostgreSQL system tables
  'information_schema' // Protect schema information
];

// SQL injection protection patterns
const DANGEROUS_PATTERNS = [
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/i,
  /UNION\s+SELECT/i,
  /--/,
  /\/\*/,
  /\*\//,
  /xp_/i,
  /sp_/i
];

function validateSQLQuery(query: string): { isValid: boolean; error?: string } {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(query)) {
      return { 
        isValid: false, 
        error: `Query contains potentially dangerous pattern: ${pattern.source}` 
      };
    }
  }

  // Check if operation is allowed
  const upperQuery = query.trim().toUpperCase();
  const isAllowed = ALLOWED_OPERATIONS.some(op => upperQuery.startsWith(op));
  
  if (!isAllowed) {
    return { 
      isValid: false, 
      error: `Operation not allowed. Allowed operations: ${ALLOWED_OPERATIONS.join(', ')}` 
    };
  }

  // Check for restricted tables
  for (const table of RESTRICTED_TABLES) {
    if (query.toLowerCase().includes(table.toLowerCase())) {
      return { 
        isValid: false, 
        error: `Access to table '${table}' is restricted for security reasons` 
      };
    }
  }

  return { isValid: true };
}

export function executeSql({ session }: { session: Session }) {
  return tool({
    description: `Execute SQL queries on the database. 
    
    CAPABILITIES:
    - SELECT: Query data from tables (Chat, Task, AITrigger, Document, etc.)
    - INSERT: Add new records
    - UPDATE: Modify existing records  
    - DELETE: Remove records
    - CREATE/ALTER/DROP: Manage table structure
    - CREATE/DROP INDEX: Manage database indexes
    
    SECURITY RESTRICTIONS:
    - Cannot access User table (authentication data protected)
    - Cannot access system tables (pg_*, information_schema)
    - SQL injection patterns are blocked
    - Only specific operations are allowed
    
    AVAILABLE TABLES:
    - Chat: User conversations
    - Task: User tasks and todos
    - AITrigger: Automated AI triggers
    - Document: User documents
    - Message_v2: Chat messages
    - Vote_v2: Message votes
    - Suggestion: Document suggestions
    - Stream: Chat streams
    
    EXAMPLES:
    - "SELECT * FROM Task WHERE userId = 'user-id' ORDER BY createdAt DESC"
    - "INSERT INTO Task (userId, title, description, status) VALUES ('user-id', 'New Task', 'Description', 'pending')"
    - "UPDATE Task SET status = 'completed' WHERE id = 'task-id'"
    - "SELECT COUNT(*) FROM Chat WHERE userId = 'user-id'"`,
    
    parameters: z.object({
      query: z.string().describe('The SQL query to execute'),
      explanation: z.string().describe('Brief explanation of what this query does and why it is needed'),
    }),
    
    execute: async ({ query, explanation }) => {
      try {
        // Validate the SQL query
        const validation = validateSQLQuery(query);
        if (!validation.isValid) {
          return {
            success: false,
            error: `SQL validation failed: ${validation.error}`,
            query,
            explanation
          };
        }

        // Create database connection
        const client = postgres(process.env.POSTGRES_URL!, {
          max: 1,
          connect_timeout: 10,
          idle_timeout: 10,
        });

        let result;
        const startTime = Date.now();

        try {
          // Execute the query
          result = await client.unsafe(query);
          
          const executionTime = Date.now() - startTime;
          
          // Close connection
          await client.end();

          // Format result based on query type
          const queryType = query.trim().toUpperCase().split(' ')[0];
          
          let formattedResult;
          if (queryType === 'SELECT') {
            formattedResult = {
              rows: Array.isArray(result) ? result : [result],
              rowCount: Array.isArray(result) ? result.length : 1
            };
          } else if (queryType === 'INSERT' || queryType === 'UPDATE' || queryType === 'DELETE') {
            formattedResult = {
              affectedRows: result.count || 0,
              message: `${queryType} operation completed successfully`
            };
          } else {
            formattedResult = {
              message: `${queryType} operation completed successfully`,
              result: result
            };
          }

          return {
            success: true,
            data: formattedResult,
            query,
            explanation,
            executionTime: `${executionTime}ms`,
            queryType,
            timestamp: new Date().toISOString()
          };

        } catch (dbError: any) {
          await client.end();
          throw dbError;
        }

      } catch (error: any) {
        return {
          success: false,
          error: `Database error: ${error.message}`,
          query,
          explanation,
          timestamp: new Date().toISOString()
        };
      }
    },
  });
}
