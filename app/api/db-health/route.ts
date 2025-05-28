import { NextRequest } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const client = postgres(process.env.POSTGRES_URL!, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 10,
    });
    
    const db = drizzle(client);
    
    // Test basic connection
    const timeResult = await client`SELECT NOW() as current_time`;
    
    // Check if our tables exist
    const tableCheck = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Task', 'AITrigger', 'User', 'Chat')
      ORDER BY table_name
    `;
    
    // Check constraints
    const constraintCheck = await client`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND constraint_type = 'FOREIGN KEY'
      AND table_name IN ('Task', 'AITrigger')
      ORDER BY table_name, constraint_name
    `;
    
    await client.end();
    
    const existingTables = tableCheck.map(t => t.table_name);
    const missingTables = ['Task', 'AITrigger', 'User', 'Chat'].filter(
      table => !existingTables.includes(table)
    );
    
    return Response.json({
      status: 'healthy',
      timestamp: timeResult[0].current_time,
      database: {
        connected: true,
        tables: {
          existing: existingTables,
          missing: missingTables,
          total: existingTables.length
        },
        constraints: constraintCheck.length,
        ready: missingTables.length === 0
      }
    });
    
  } catch (error: any) {
    return Response.json({
      status: 'error',
      error: error.message,
      code: error.code,
      database: {
        connected: false,
        ready: false
      }
    }, { status: 500 });
  }
} 