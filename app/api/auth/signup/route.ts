import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await signUp(email, username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = result.user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
