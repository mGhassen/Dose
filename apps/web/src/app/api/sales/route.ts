// Sales API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, CreateSaleData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    itemId: row.item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: undefined, // Will be populated separately
  };
}

function transformToSnakeCase(data: CreateSaleData): any {
  return {
    date: data.date,
    type: data.type,
    amount: data.amount,
    quantity: data.quantity,
    description: data.description,
    item_id: data.itemId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build count query
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    // Build data query (items will be fetched manually since there's no FK)
    let query = supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
      countQuery = countQuery
        .gte('date', startDate)
        .lte('date', endDate);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      query = query
        .gte('date', startOfMonth)
        .lte('date', endDate);
      countQuery = countQuery
        .gte('date', startOfMonth)
        .lte('date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
      countQuery = countQuery.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    // Fetch items in batch to avoid N+1 queries
    const itemIds = [...new Set((data || []).map((row: any) => row.item_id).filter(Boolean))];
    const itemsMap = new Map<number, any>();
    
    if (itemIds.length > 0) {
      // Fetch items
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .in('id', itemIds);
      
      if (itemsData) {
        itemsData.forEach(item => {
          itemsMap.set(item.id, item);
        });
      }
      
      // Fetch recipes for remaining item_ids
      const foundItemIds = new Set(itemsData?.map(i => i.id) || []);
      const recipeIds = itemIds.filter(id => !foundItemIds.has(id));
      
      if (recipeIds.length > 0) {
        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);
        
        if (recipesData) {
          recipesData.forEach(recipe => {
            itemsMap.set(recipe.id, { ...recipe, item_type: 'recipe' });
          });
        }
      }
    }

    // Transform sales with items
    const sales: Sale[] = (data || []).map((row: any) => {
      const sale = transformSale(row);
      
      if (sale.itemId && itemsMap.has(sale.itemId)) {
        const itemData = itemsMap.get(sale.itemId);
        if (itemData.item_type === 'recipe') {
          sale.item = {
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            category: itemData.category,
            sku: undefined,
            unit: itemData.unit || 'serving',
            unitPrice: undefined,
            itemType: 'recipe',
            isActive: itemData.is_active,
            createdAt: itemData.created_at,
            updatedAt: itemData.updated_at,
          };
        } else {
          sale.item = {
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            category: itemData.category,
            sku: itemData.sku,
            unit: itemData.unit,
            unitPrice: itemData.unit_price ? parseFloat(itemData.unit_price) : undefined,
            itemType: itemData.item_type,
            isActive: itemData.is_active,
            createdAt: itemData.created_at,
            updatedAt: itemData.updated_at,
          };
        }
      }
      
      return sale;
    });
    
    const total = count || 0;
    
    const response: PaginatedResponse<Sale> = createPaginatedResponse(
      sales,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSaleData = await request.json();
    
    if (!body.date || !body.type || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: date, type, amount' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Validate itemId if provided - check if it exists in items or recipes
    if (body.itemId) {
      const [itemCheck, recipeCheck] = await Promise.all([
        supabase.from('items').select('id').eq('id', body.itemId).single(),
        supabase.from('recipes').select('id').eq('id', body.itemId).single(),
      ]);
      
      if (itemCheck.error && recipeCheck.error) {
        return NextResponse.json(
          { error: `Item or recipe with id ${body.itemId} not found` },
          { status: 400 }
        );
      }
    }
    
    const { data, error } = await supabase
      .from('sales')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    // Create an INPUT entry for the sale
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'input',
        entry_type: 'sale',
        name: body.description || `Sale - ${body.type}`,
        amount: body.amount,
        description: body.description,
        entry_date: body.date,
        reference_id: data.id,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating entry for sale:', entryError);
      // Don't fail the sale creation if entry creation fails, but log it
    }

    return NextResponse.json(transformSale(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale', details: error.message },
      { status: 500 }
    );
  }
}

