import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HCC Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage users and invitations</p>
          </div>
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
} 