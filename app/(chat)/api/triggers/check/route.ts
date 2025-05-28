import { auth } from '@/app/(auth)/auth';
import { checkAndExecuteTriggers } from '@/lib/ai/proactive-chat';
import { ChatSDKError } from '@/lib/errors';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    console.log(`Manual trigger check requested by user: ${session.user.email}`);
    
    // Execute the proactive AI check
    await checkAndExecuteTriggers();
    
    return Response.json({ 
      success: true, 
      message: 'Trigger check completed successfully' 
    });
  } catch (error) {
    console.error('Failed to execute trigger check:', error);
    return new ChatSDKError('bad_request:api', 'Failed to execute trigger check').toResponse();
  }
} 