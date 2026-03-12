import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const urlLocale = request.nextUrl.searchParams.get('lang');
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = urlLocale || cookieLocale || 'fr';

  const response = NextResponse.next();
  if (!request.cookies.get('NEXT_LOCALE') || (urlLocale && urlLocale !== cookieLocale)) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 31536000,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_static|.*\\..*).*)'],
};
