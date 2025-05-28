import { auth } from '@/app/(auth)/auth';
import { createTask, getTasksByUserId, updateTask } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const tasks = await getTasksByUserId({ userId: session.user.id });
    return Response.json(tasks);
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const { title, description, dueDate, priority } = await request.json();

    if (!title) {
      return new ChatSDKError('bad_request:api', 'Title is required').toResponse();
    }

    const task = await createTask({
      userId: session.user.id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
    });

    // Schedule AI triggers for this task
    await scheduleTaskTriggers(task);

    return Response.json(task);
  } catch (error) {
    console.error('Failed to create task:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const { id, title, description, dueDate, priority, status } = await request.json();

    if (!id) {
      return new ChatSDKError('bad_request:api', 'Task ID is required').toResponse();
    }

    const updatedTask = await updateTask({
      id,
      userId: session.user.id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      status,
    });

    return Response.json(updatedTask);
  } catch (error) {
    console.error('Failed to update task:', error);
    return new ChatSDKError('bad_request:database').toResponse();
  }
}

// Helper function to schedule AI triggers
async function scheduleTaskTriggers(task: any) {
  if (!task.dueDate) return;

  const { createAITrigger } = await import('@/lib/db/queries');
  const { subDays, subHours, addHours } = await import('date-fns');

  const triggers = [
    {
      type: 'reminder',
      time: subDays(new Date(task.dueDate), 1),
      message: `Reminder: "${task.title}" is due tomorrow. How are you progressing?`
    },
    {
      type: 'due_soon',
      time: subHours(new Date(task.dueDate), 2),
      message: `Your task "${task.title}" is due in 2 hours. Need any help?`
    },
    {
      type: 'overdue',
      time: addHours(new Date(task.dueDate), 1),
      message: `"${task.title}" is overdue. What's blocking you?`
    }
  ];

  for (const trigger of triggers) {
    // Only schedule future triggers
    if (trigger.time > new Date()) {
      await createAITrigger({
        userId: task.userId,
        taskId: task.id,
        triggerType: trigger.type,
        triggerTime: trigger.time,
        message: trigger.message,
      });
    }
  }
} 