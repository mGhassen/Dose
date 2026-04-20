alter table public.recipes
add column if not exists output_quantity numeric not null default 1;

update public.recipes
set output_quantity = coalesce(serving_size::numeric, 1)
where output_quantity is null
   or output_quantity = 1;
