import { NextRequest } from 'next/server';
import { handleMigrationRequest } from '@smartlogbook/lib/api/migration-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMigrationRequest('users', `/api/users/${id}`, request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMigrationRequest('users', `/api/users/${id}`, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleMigrationRequest('users', `/api/users/${id}`, request);
}
