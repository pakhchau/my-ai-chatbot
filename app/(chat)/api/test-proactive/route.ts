import { auth } from '@/app/(auth)/auth';
import { createTask, createAITrigger } from '@/lib/db/queries';
import { checkAndExecuteTriggers } from '@/lib/ai/proactive-chat';
import { ChatSDKError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    console.log('🧪 Creating test task and trigger...');
    
    // Create a test task
    const testTask = await createTask({
      userId: session.user.id,
      title: 'Test Task for AI Proactive System',
      description: 'This is a test task to verify the proactive AI system works',
      dueDate: addMinutes(new Date(), 5), // Due in 5 minutes
      priority: 'high'
    });

    // Create an immediate trigger (due now)
    await createAITrigger({
      userId: session.user.id,
      taskId: testTask.id,
      triggerType: 'reminder',
      triggerTime: new Date(), // Trigger now
      message: `🧪 Test: Your task "${testTask.title}" needs attention. This is a test of the proactive AI system!`
    });

    // Execute triggers immediately
    await checkAndExecuteTriggers();

    return Response.json({ 
      success: true, 
      message: 'Test completed! Check your chat history for a new AI conversation.',
      taskId: testTask.id
    });
  } catch (error) {
    console.error('Test failed:', error);
    return new ChatSDKError('bad_request:api', 'Test failed').toResponse();
  }
} 