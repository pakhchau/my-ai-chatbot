import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { emailWhitelist, user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
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
    const { email } = inviteUserSchema.parse(body);

    // Check if email is already whitelisted
    const existingWhitelist = await db
      .select()
      .from(emailWhitelist)
      .where(eq(emailWhitelist.email, email))
      .limit(1);

    if (existingWhitelist.length > 0) {
      return NextResponse.json({ error: 'Email already whitelisted' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Add email to whitelist
    const [newWhitelist] = await db
      .insert(emailWhitelist)
      .values({
        email,
        invitedBy: session.user.id,
      })
      .returning();

    // Generate invitation message
    const invitationMessage = `Hi there!

You've been invited to join HCC's AI Assistant platform.

To get started:
1. Visit: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup
2. Sign up with this email address: ${email}
3. Once registered, you'll have access to our AI-powered tools and features

If you have any questions, feel free to reach out!

Best regards,
HCC Team`;

    return NextResponse.json({
      success: true,
      whitelist: newWhitelist,
      invitationMessage,
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 