import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Only run on the home page
  if (request.nextUrl.pathname === '/') {
    const token = await getToken({ req: request });
    if (token) {
      // Redirect authenticated users to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  // Default: continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Only run middleware on the home page
};
