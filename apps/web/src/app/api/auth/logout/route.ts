import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('access_token', '', { path: '/', maxAge: 0 });
  return response;
}