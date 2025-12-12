import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/config/supabase';
import { loginSchema } from '@/lib/validations/auth';
import type { ApiError } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    if (error) {
      return NextResponse.json<ApiError>(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue lors de la connexion' },
      { status: 500 }
    );
  }
}
