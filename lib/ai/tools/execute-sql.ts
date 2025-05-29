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
  // 'User', // Allow access to User table now
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
    - Cannot access system tables (pg_*, information_schema)
    - SQL injection patterns are blocked
    - Only specific operations are allowed
    
    IMPORTANT:
    - When referencing the user ID column in the Task table, ALWAYS use "userId" (with quotes and camelCase)
    
    AVAILABLE TABLES:
    - User: User authentication and profile data (now accessible)
    - Chat: User conversations
    - Task: User tasks and todos
    - AITrigger: Automated AI triggers
    - Document: User documents
    - Message_v2: Chat messages
    - Vote_v2: Message votes
    - Suggestion: Document suggestions
    - Stream: Chat streams
    
    EXAMPLES:
    - "SELECT * FROM Task WHERE \"userId\" = 'user-id' ORDER BY createdAt DESC"
    - "INSERT INTO Task (\"userId\", title, description, status) VALUES ('user-id', 'New Task', 'Description', 'pending')"
    - "UPDATE Task SET status = 'completed' WHERE id = 'task-id' AND \"userId\" = 'user-id'"
    - "SELECT COUNT(*) FROM Chat WHERE \"userId\" = 'user-id'"`,
    
    parameters: z.object({
      query: z.string().describe('The SQL query to execute'),
      explanation: z.string().describe('Brief explanation of what this query does and why it is needed'),
    }),
    
    execute: async ({ query, explanation }) => {
      console.log('🔧 SQL TOOL CALLED!');
      console.log('📝 Query:', query);
      console.log('💭 Explanation:', explanation);
      console.log('👤 User ID:', session.user?.id);
      
      try {
        // Get the actual logged-in user ID
        const actualUserId = session.user?.id;
        if (!actualUserId) {
          return {
            success: false,
            error: 'No authenticated user found',
            query,
            explanation
          };
        }

        // Substitute 'userId' placeholder with actual user ID
        let processedQuery = query.replace(/'userId'/g, `'${actualUserId}'`);
        processedQuery = processedQuery.replace(/"userId"/g, `"${actualUserId}"`);
        processedQuery = processedQuery.replace(/userId/g, `'${actualUserId}'`);
        
        // For queries that don't have explicit user filtering, add it automatically for user-specific tables
        const userSpecificTables = ['Chat', 'Task', 'Document', 'Message_v2', 'Vote_v2', 'Suggestion', 'AITrigger'];
        const upperQuery = processedQuery.toUpperCase();
        
        // Auto-add user filtering for SELECT queries on user-specific tables if not already present
        if (upperQuery.startsWith('SELECT') && !upperQuery.includes('WHERE')) {
          for (const table of userSpecificTables) {
            if (upperQuery.includes(`"${table.toUpperCase()}"`)) {
              processedQuery += ` WHERE "userId" = '${actualUserId}'`;
              console.log('🔒 Auto-added user filtering for security');
              break;
            }
          }
        }

        console.log('🔄 Processed Query:', processedQuery);

        // Validate the processed SQL query
        const validation = validateSQLQuery(processedQuery);
        if (!validation.isValid) {
          console.log('❌ SQL Validation Failed:', validation.error);
          return {
            success: false,
            error: `SQL validation failed: ${validation.error}`,
            query: processedQuery,
            explanation
          };
        }

        console.log('✅ SQL Validation Passed');

        // Create database connection
        const client = postgres(process.env.POSTGRES_URL!, {
          max: 1,
          connect_timeout: 10,
          idle_timeout: 10,
        });

        let result;
        const startTime = Date.now();

        try {
          console.log('🔌 Executing SQL query...');
          // Execute the processed query
          result = await client.unsafe(processedQuery);
          
          const executionTime = Date.now() - startTime;
          console.log(`⚡ Query executed in ${executionTime}ms`);
          
          // Close connection
          await client.end();

          // Format result based on query type
          const queryType = processedQuery.trim().toUpperCase().split(' ')[0];
          
          let formattedResult;
          if (queryType === 'SELECT') {
            formattedResult = {
              rows: Array.isArray(result) ? result : [result],
              rowCount: Array.isArray(result) ? result.length : 1
            };
            console.log(`📊 SELECT returned ${formattedResult.rowCount} rows`);
          } else if (queryType === 'INSERT' || queryType === 'UPDATE' || queryType === 'DELETE') {
            formattedResult = {
              affectedRows: result.count || 0,
              message: `${queryType} operation completed successfully`
            };
            console.log(`📝 ${queryType} affected ${formattedResult.affectedRows} rows`);
          } else {
            formattedResult = {
              message: `${queryType} operation completed successfully`,
              result: result
            };
            console.log(`🔧 ${queryType} operation completed`);
          }

          const response = {
            success: true,
            data: formattedResult,
            query: processedQuery, // Return the processed query
            explanation,
            executionTime: `${executionTime}ms`,
            queryType,
            timestamp: new Date().toISOString()
          };

          console.log('✅ SQL Tool Success:', JSON.stringify(response, null, 2));
          return response;

        } catch (dbError: any) {
          await client.end();
          console.log('❌ Database Error:', dbError.message);
          throw dbError;
        }

      } catch (error: any) {
        const errorResponse = {
          success: false,
          error: `Database error: ${error.message}`,
          query,
          explanation,
          timestamp: new Date().toISOString()
        };
        console.log('❌ SQL Tool Error:', JSON.stringify(errorResponse, null, 2));
        return errorResponse;
      }
    },
  });
}
