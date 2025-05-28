'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  status: string;
  createdAt: string;
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
        setIsCreating(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status })
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const triggerAICheck = async () => {
    try {
      const response = await fetch('/api/triggers/check', {
        method: 'POST'
      });

      if (response.ok) {
        alert('AI check triggered! Check your chat history for any new conversations.');
      }
    } catch (error) {
      console.error('Failed to trigger AI check:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Task Manager</h2>
        <div className="space-x-2">
          <Button onClick={triggerAICheck} variant="outline">
            🤖 Trigger AI Check
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            + New Task
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Textarea
              placeholder="Task description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex space-x-4">
              <Input
                type="datetime-local"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="px-3 py-2 border rounded-md"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={createTask} disabled={!newTask.title}>
                Create Task
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-3">
                    <Badge className={`${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {task.priority}
                    </Badge>
                    <Badge className={`${task.status === 'completed' ? 'bg-green-100 text-green-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {task.status}
                    </Badge>
                    {task.dueDate && (
                      <span className="text-sm text-gray-500">
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {task.status !== 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                    >
                      ✓ Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      )}
    </div>
  );
} 