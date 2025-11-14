import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get locale from URL params first, then cookie, default to 'fr'
  const urlLocale = request.nextUrl.searchParams.get('lang');
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = urlLocale || cookieLocale || 'fr';
  
  // Set the locale cookie if it doesn't exist or if URL param is different
  const response = NextResponse.next();
  if (!request.cookies.get('NEXT_LOCALE') || (urlLocale && urlLocale !== cookieLocale)) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 31536000, // 1 year
    });
  }
  
  return response;
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /_static (inside /public)
  // - all root files inside /public (e.g. /favicon.ico)
  matcher: ['/((?!api|_next|_static|.*\\..*).*)']
};
