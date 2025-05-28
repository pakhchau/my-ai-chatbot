import { TaskManager } from '@/components/task-manager';

export default function TasksPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-6">
        <TaskManager />
      </main>
    </div>
  );
} 