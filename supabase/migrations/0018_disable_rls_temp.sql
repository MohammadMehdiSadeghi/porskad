-- موقتاً RLS رو غیرفعال می‌کنیم تا مشکل فرم حل بشه
ALTER TABLE public.responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers DISABLE ROW LEVEL SECURITY;
