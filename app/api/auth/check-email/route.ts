import { NextRequest, NextResponse } from 'next/server';
import { emailWhitelist, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const checkEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkEmailSchema.parse(body);

    // Check if email is whitelisted
    const whitelisted = await db
      .select()
      .from(emailWhitelist)
      .where(eq(emailWhitelist.email, email))
      .limit(1);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return NextResponse.json({
      isWhitelisted: whitelisted.length > 0,
      userExists: existingUser.length > 0,
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 