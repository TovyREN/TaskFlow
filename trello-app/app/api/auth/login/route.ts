import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import type { ApiError } from '@/types/auth';

export const dynamic = "force-static";
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    
    // Authentifier l'utilisateur
    const { user, token } = await loginUser(
      validatedData.email,
      validatedData.password
    );
    
    // Créer la réponse avec le cookie de session
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        contactInfo: user.contactInfo,
      },
      token: token,
      session: {
        access_token: token,
      },
    });
    
    // Définir le cookie
    response.cookies.set('sb-access-token', token, {
      httpOnly: true,
      // If you're running `next start` locally (NODE_ENV=production) over http,
      // a Secure cookie would be silently dropped by the browser.
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json<ApiError>(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue lors de la connexion' },
      { status: 500 }
    );
  }
}
