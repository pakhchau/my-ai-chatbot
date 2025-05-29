import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await db
      .select()
      .from(user)
      .where(and(eq(user.id, session.user.id), eq(user.isActive, true)))
      .limit(1);

    if (!currentUser.length || currentUser[0].role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        invitedAt: user.invitedAt,
        invitedBy: user.invitedBy,
      })
      .from(user)
      .orderBy(user.email);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 