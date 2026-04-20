-- stock_movements.movement_type stores lowercase values ('in', 'out', …) per schema.
-- Aggregates used uppercase literals, so qty_in/qty_out/net/daily were always 0 while by_type still showed rows.

create or replace function stock_movements_analytics(
  p_start_date timestamptz default null,
  p_end_date   timestamptz default null,
  p_item_ids   bigint[]    default null,
  p_movement_types text[] default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  with filtered as (
    select
      sm.id,
      sm.item_id,
      sm.movement_type,
      sm.quantity::numeric        as quantity,
      sm.location,
      sm.reference_type,
      sm.movement_date,
      i.name                       as item_name,
      sm.unit                      as item_unit,
      ic.label                     as item_category
    from stock_movements sm
    left join items i on i.id = sm.item_id
    left join item_categories ic on ic.id = i.category_id
    where (p_start_date is null or sm.movement_date >= p_start_date)
      and (p_end_date   is null or sm.movement_date <= p_end_date)
      and (p_item_ids is null or sm.item_id = any(p_item_ids))
      and (p_movement_types is null or sm.movement_type = any(p_movement_types))
  ),
  daily as (
    select
      to_char(date_trunc('day', movement_date), 'YYYY-MM-DD') as date,
      sum(case when movement_type = 'in'         then quantity else 0 end) as qty_in,
      sum(case when movement_type = 'out'        then quantity else 0 end) as qty_out,
      sum(case when movement_type = 'waste'      then quantity else 0 end) as qty_waste,
      sum(case when movement_type = 'expired'    then quantity else 0 end) as qty_expired,
      sum(case when movement_type = 'adjustment' then quantity else 0 end) as qty_adj,
      count(*)                                                              as count,
      sum(
        case
          when movement_type = 'in'                                 then quantity
          when movement_type in ('out','waste','expired')            then -quantity
          when movement_type = 'adjustment'                          then quantity
          else 0
        end
      ) as net
    from filtered
    group by 1
    order by 1
  ),
  by_type as (
    select movement_type as type, count(*) as count, sum(quantity) as qty
    from filtered
    group by movement_type
  ),
  by_category as (
    select
      coalesce(nullif(trim(item_category), ''), 'Uncategorized') as name,
      sum(case when movement_type = 'in' then quantity else 0 end) as qty_in,
      sum(case when movement_type in ('out','waste','expired') then quantity else 0 end) as qty_out,
      sum(
        case
          when movement_type = 'in'                                 then quantity
          when movement_type in ('out','waste','expired')            then -quantity
          when movement_type = 'adjustment'                          then quantity
          else 0
        end
      ) as net,
      count(*) as count
    from filtered
    group by 1
    order by count desc
    limit 24
  ),
  by_location as (
    select coalesce(nullif(trim(location), ''), '—') as name, count(*) as value
    from filtered
    group by 1
    order by value desc
    limit 12
  ),
  by_reference as (
    select coalesce(reference_type, 'Manual') as name, count(*) as value
    from filtered
    group by 1
    order by value desc
  ),
  top_items as (
    select
      item_id,
      coalesce(item_name, 'Item ' || item_id::text) as name,
      coalesce(max(item_unit), '') as unit,
      sum(case when movement_type = 'in' then quantity else 0 end) as qty_in,
      sum(case when movement_type in ('out','waste','expired') then quantity else 0 end) as qty_out,
      sum(
        case
          when movement_type = 'in'                                 then quantity
          when movement_type in ('out','waste','expired')            then -quantity
          when movement_type = 'adjustment'                          then quantity
          else 0
        end
      ) as net,
      count(*) as count
    from filtered
    where item_id is not null
    group by item_id, item_name
    order by count desc
    limit 15
  ),
  weekday as (
    select
      extract(isodow from movement_date)::int as dow,
      count(*) as count,
      sum(quantity) as qty
    from filtered
    group by 1
  ),
  totals as (
    select
      count(*)                                                                     as total_count,
      sum(case when movement_type = 'in' then quantity else 0 end)                  as total_in_qty,
      sum(case when movement_type = 'out' then quantity else 0 end)                 as total_out_qty,
      sum(case when movement_type = 'waste' then quantity else 0 end)               as total_waste_qty,
      sum(case when movement_type = 'expired' then quantity else 0 end)             as total_expired_qty,
      sum(case when movement_type = 'adjustment' then quantity else 0 end)          as total_adj_qty,
      count(*) filter (where movement_type = 'in')                                  as count_in,
      count(*) filter (where movement_type = 'out')                                 as count_out,
      count(*) filter (where movement_type = 'waste')                               as count_waste,
      count(*) filter (where movement_type = 'expired')                             as count_expired,
      sum(
        case
          when movement_type = 'in'                                 then quantity
          when movement_type in ('out','waste','expired')            then -quantity
          when movement_type = 'adjustment'                          then quantity
          else 0
        end
      ) as net
    from filtered
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(totals.*) from totals),
    'daily', coalesce((
      select jsonb_agg(to_jsonb(daily.*) order by daily.date)
      from daily
    ), '[]'::jsonb),
    'by_type', coalesce((
      select jsonb_agg(to_jsonb(by_type.*) order by by_type.count desc)
      from by_type
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(to_jsonb(by_category.*))
      from by_category
    ), '[]'::jsonb),
    'by_location', coalesce((
      select jsonb_agg(to_jsonb(by_location.*))
      from by_location
    ), '[]'::jsonb),
    'by_reference', coalesce((
      select jsonb_agg(to_jsonb(by_reference.*))
      from by_reference
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(to_jsonb(top_items.*))
      from top_items
    ), '[]'::jsonb),
    'weekday', coalesce((
      select jsonb_agg(to_jsonb(weekday.*) order by weekday.dow)
      from weekday
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
