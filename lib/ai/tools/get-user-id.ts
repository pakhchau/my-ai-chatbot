import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';

export function getUserId({ session }: { session: Session }) {
  return tool({
    description: `Get the current logged-in user's ID. 
    
    Use this tool when users ask:
    - "What's my user ID?"
    - "What is my user ID?"
    - "Show me my user ID"
    - "What's my ID?"
    - Any variation asking for their user identifier
    
    This returns the authenticated user's unique identifier from the session.`,
    
    parameters: z.object({}),
    
    execute: async () => {
      const userId = session.user?.id;
      
      if (!userId) {
        return {
          success: false,
          error: 'No authenticated user found'
        };
      }

      return {
        success: true,
        userId: userId,
        message: `Your user ID is: ${userId}`
      };
    },
  });
} 