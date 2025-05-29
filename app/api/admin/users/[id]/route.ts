import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const updateUserSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const updates = updateUserSchema.parse(body);

    // Prevent admin from deactivating themselves
    if (params.id === session.user.id && updates.isActive === false) {
      return NextResponse.json({ 
        error: 'Cannot deactivate your own account' 
      }, { status: 400 });
    }

    // Update user
    const [updatedUser] = await db
      .update(user)
      .set(updates)
      .where(eq(user.id, params.id))
      .returning({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        invitedAt: user.invitedAt,
        invitedBy: user.invitedBy,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 