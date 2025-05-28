import { tool } from 'ai';
import { z } from 'zod';
import postgres from 'postgres';
import type { Session } from 'next-auth';

export function getDatabaseSchema({ session }: { session: Session }) {
  return tool({
    description: `Get the schema for the entire database: all table names, columns, and types.`,
    parameters: z.object({}),
    execute: async () => {
      const client = postgres(process.env.POSTGRES_URL!, {
        max: 1,
        connect_timeout: 10,
        idle_timeout: 10,
      });
      try {
        const result = await client`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position
        `;
        await client.end();
        return { success: true, schema: result };
      } catch (error: any) {
        await client.end();
        return { success: false, error: error.message };
      }
    },
  });
} 