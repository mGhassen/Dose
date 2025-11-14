import { NextRequest } from 'next/server';
import { handleMigrationRequest } from '@kit/lib/api/migration-helper';

export async function GET(request: NextRequest) {
  return handleMigrationRequest('users', '/api/users', request);
}

export async function POST(request: NextRequest) {
  return handleMigrationRequest('users', '/api/users', request);
}