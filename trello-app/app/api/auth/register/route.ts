import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/config/supabase';
import { registerSchema } from '@/lib/validations/auth';
import type { ApiError } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json<ApiError>(
        { error: 'Configuration Supabase manquante' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validatedData = registerSchema.parse(body);
    
    // Créer l'utilisateur avec Supabase Auth
    // Le trigger 'on_auth_user_created' créera automatiquement le profil
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
      },
    });
    
    if (authError) {
      return NextResponse.json<ApiError>(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json<ApiError>(
        { error: 'Échec de la création de l\'utilisateur' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      user: authData.user,
      session: authData.session,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  }
}
