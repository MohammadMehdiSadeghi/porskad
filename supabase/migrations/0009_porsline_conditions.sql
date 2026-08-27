-- ════════════════════════════════════════════════════════════════
-- Porsline-style Conditional Logic
-- اضافه کردن فیلدهای conditions (گروه شرط visibility) و jump_actions (پرش هر گزینه)
-- روی جدول questions
-- ════════════════════════════════════════════════════════════════

-- ─── فیلد conditions (گروه شرط‌ها برای visibility سوال) ───
-- ساختار:
-- {
--   "group_operator": "AND" | "OR",
--   "conditions": [
--     { "id": "uuid", "source_question_id": "uuid", "operator": "equals", "value": "string" }
--   ]
-- }
alter table public.questions
  add column if not exists conditions jsonb default null;

-- ─── فیلد jump_actions (اکشن پرش به ازای هر گزینه) ───
-- ساختار:
-- [
--   { "id": "uuid", "option_index": 0, "action_type": "jump_to_question", "target_id": "uuid", "target_url": null },
--   { "id": "uuid", "option_index": 1, "action_type": "end_form", "target_id": null, "target_url": null }
-- ]
alter table public.questions
  add column if not exists jump_actions jsonb default '[]'::jsonb;

-- ─── به‌روزرسانی تابع save_form ───
-- اضافه کردن ذخیره conditions و jump_actions

create or replace function public.save_form(
  p_form_id   uuid,
  p_form      jsonb,
  p_questions jsonb
)
returns setof public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form_id uuid;
  q jsonb;
  q_id uuid;
  q_pos int := 0;
begin
  -- به‌روزرسانی فرم
  update public.forms set
    title           = p_form->>'title',
    description     = p_form->>'description',
    slug            = p_form->>'slug',
    welcome_title   = p_form->>'welcome_title',
    welcome_message = p_form->>'welcome_message',
    exit_title      = p_form->>'exit_title',
    exit_message    = p_form->>'exit_message',
    published       = (p_form->>'published')::boolean
  where id = p_form_id
  returning id into v_form_id;

  if v_form_id is null then
    raise exception 'form not found';
  end if;

  -- حذف سوالات قدیمی که در لیست جدید نیستن
  delete from public.questions
  where form_id = v_form_id
    and id not in (
      select (elem->>'id')::uuid
      from jsonb_array_elements(p_questions) as elem
      where elem->>'id' is not null and elem->>'id' != 'null'
    );

  -- درج یا به‌روزرسانی سوالات
  for q in select value from jsonb_array_elements(p_questions) as elem
  loop
    q_pos := q_pos + 1;

    if (q->>'id') is not null and (q->>'id') != 'null' and (q->>'id') != '' then
      q_id := (q->>'id')::uuid;
      update public.questions set
        type        = q->>'type',
        title       = q->>'title',
        description = q->>'description',
        required    = (q->>'required')::boolean,
        options     = coalesce(q->'options', '[]'::jsonb),
        position    = q_pos - 1,
        condition   = nullif(q->>'condition', 'null')::jsonb,
        conditions  = nullif(q->>'conditions', 'null')::jsonb,
        jump_actions = coalesce(q->'jump_actions', '[]'::jsonb)
      where id = q_id and form_id = v_form_id;
    else
      insert into public.questions (form_id, type, title, description, required, options, position, condition, conditions, jump_actions)
      values (
        v_form_id,
        q->>'type',
        q->>'title',
        q->>'description',
        (q->>'required')::boolean,
        coalesce(q->'options', '[]'::jsonb),
        q_pos - 1,
        nullif(q->>'condition', 'null')::jsonb,
        nullif(q->>'conditions', 'null')::jsonb,
        coalesce(q->'jump_actions', '[]'::jsonb)
      )
      returning id into q_id;
    end if;

    -- برگرداندن سوال با id واقعی
    return query select * from public.questions where id = q_id;
  end loop;
end;
$$;
