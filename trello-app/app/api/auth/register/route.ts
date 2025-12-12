import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/config/supabase';
import { registerSchema } from '@/lib/validations/auth';
import type { ApiError } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);
    
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
      },
    });
    
    if (error) {
      return NextResponse.json<ApiError>(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      user: data.user,
      session: data.session,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  }
}
