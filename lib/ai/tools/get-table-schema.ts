import { tool } from 'ai';
import { z } from 'zod';
import postgres from 'postgres';
import type { Session } from 'next-auth';

export function getTableSchema({ session }: { session: Session }) {
  return tool({
    description: `Get the schema for a specific table: columns and types.`,
    parameters: z.object({
      tableName: z.string().describe('The name of the table to inspect'),
    }),
    execute: async ({ tableName }) => {
      const client = postgres(process.env.POSTGRES_URL!, {
        max: 1,
        connect_timeout: 10,
        idle_timeout: 10,
      });
      try {
        const result = await client`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
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