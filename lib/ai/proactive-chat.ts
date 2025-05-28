import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { 
  getPendingTriggers, 
  markTriggerExecuted, 
  saveChat, 
  saveMessages 
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function checkAndExecuteTriggers() {
  try {
    console.log('🤖 Checking for pending AI triggers...');
    
    const pendingTriggers = await getPendingTriggers();
    
    if (pendingTriggers.length === 0) {
      console.log('No pending triggers found.');
      return;
    }

    console.log(`Found ${pendingTriggers.length} pending triggers`);

    for (const { trigger, task, user } of pendingTriggers) {
      if (!user || !trigger) continue;

      try {
        console.log(`Processing trigger: ${trigger.triggerType} for user ${user.email}`);
        
        // Generate personalized AI message
        const aiMessage = await generateProactiveMessage(trigger, task);
        
        // Create a new chat for this proactive conversation
        const chatId = generateUUID();
        const messageId = generateUUID();
        
        await saveChat({
          id: chatId,
          userId: user.id,
          title: `AI Check-in: ${task?.title || 'Task Update'}`,
          visibility: 'private'
        });

        // Save the AI's proactive message
        await saveMessages({
          messages: [{
            id: messageId,
            chatId,
            role: 'assistant',
            parts: [{ type: 'text', text: aiMessage }],
            attachments: [],
            createdAt: new Date()
          }]
        });

        // Mark trigger as executed
        await markTriggerExecuted({
          id: trigger.id,
          chatId
        });

        console.log(`✅ Created proactive chat ${chatId} for user ${user.email}`);
        
      } catch (error) {
        console.error(`Failed to process trigger ${trigger.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error checking triggers:', error);
  }
}

async function generateProactiveMessage(trigger: any, task: any) {
  // Use stored message if available, otherwise generate one
  if (trigger.message) {
    return trigger.message;
  }

  const prompts = {
    reminder: `You have a task "${task?.title}" due soon. How are you progressing with it?`,
    due_soon: `Your task "${task?.title}" is due very soon. Do you need any help completing it?`,
    overdue: `I noticed "${task?.title}" is overdue. Would you like to discuss what's blocking you or reschedule it?`,
    completion_check: `You marked "${task?.title}" as complete. How did it go? Any lessons learned?`
  };

  const baseMessage = prompts[trigger.triggerType as keyof typeof prompts] || 
    `I wanted to check in about your task: "${task?.title}". How can I help?`;

  try {
    // Generate a personalized message using AI
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are a helpful AI assistant that proactively checks in on tasks. 
               Be friendly, supportive, and offer specific help. 
               Keep messages concise (2-3 sentences max).
               Always end with a question to encourage engagement.`,
      messages: [{
        role: 'user',
        content: `Generate a personalized check-in message for this situation:
                  Task: ${task?.title || 'Unknown task'}
                  Description: ${task?.description || 'No description'}
                  Trigger type: ${trigger.triggerType}
                  Base message: ${baseMessage}`
      }]
    });

    // Convert stream to text
    let generatedMessage = '';
    for await (const chunk of result.textStream) {
      generatedMessage += chunk;
    }

    return generatedMessage || baseMessage;
    
  } catch (error) {
    console.error('Failed to generate AI message:', error);
    return baseMessage;
  }
}

// Function to manually trigger a check (useful for testing)
export async function triggerManualCheck() {
  console.log('🔄 Manual trigger check initiated...');
  await checkAndExecuteTriggers();
} 