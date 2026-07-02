import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getIntegrationWithValidToken } from '@/app/api/integrations/[id]/square/_utils';
import {
  linkItemToSquareCatalog,
  type SquareLinkSourceType,
} from '@/lib/square/link-catalog-item';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = (await request.json()) as {
      integrationId?: string | number;
      sourceType?: SquareLinkSourceType;
      sourceId?: string;
    };

    const integrationIdRaw = body.integrationId;
    const integrationId =
      typeof integrationIdRaw === 'number'
        ? integrationIdRaw
        : parseInt(String(integrationIdRaw ?? ''), 10);
    const sourceType = body.sourceType;
    const sourceId = body.sourceId?.trim();

    if (!integrationId || Number.isNaN(integrationId)) {
      return NextResponse.json({ error: 'integrationId required' }, { status: 400 });
    }
    if (sourceType !== 'catalog_variation' && sourceType !== 'catalog_item') {
      return NextResponse.json(
        { error: 'sourceType must be catalog_variation or catalog_item' },
        { status: 400 }
      );
    }
    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId required' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const result = await getIntegrationWithValidToken(
      supabase,
      String(integrationId),
      authHeader
    );
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }
    if (result.integration?.integration_type !== 'square') {
      return NextResponse.json({ error: 'Not a Square integration' }, { status: 400 });
    }

    await linkItemToSquareCatalog(
      supabase,
      integrationId,
      itemId,
      sourceType,
      sourceId,
      result.accessToken
    );

    return NextResponse.json({ ok: true, itemId, sourceType, sourceId });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status ?? 500;
    const message = error instanceof Error ? error.message : 'Failed to link Square catalog';
    console.error('POST /api/items/[id]/square-link:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
