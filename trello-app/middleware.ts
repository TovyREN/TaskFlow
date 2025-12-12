import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('sb-access-token')?.value;
  
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isBoardsPage = req.nextUrl.pathname.startsWith('/boards');
  const isHomePage = req.nextUrl.pathname === '/';

  // Si pas de token et tentative d'accès à /boards
  if (!token && isBoardsPage) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Si token existe et sur page auth, rediriger vers /boards
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/boards', req.url));
  }

  // Si token existe et sur homepage, rediriger vers /boards
  if (token && isHomePage) {
    return NextResponse.redirect(new URL('/boards', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/boards/:path*',
    '/auth/:path*',
  ],
};
