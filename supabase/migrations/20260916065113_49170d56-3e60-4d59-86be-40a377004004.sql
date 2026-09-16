DROP POLICY IF EXISTS "Inloggade kan se roller" ON public.anvandarroller;
CREATE POLICY "Man ser sin egen roll" ON public.anvandarroller FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Administratorer ser alla roller" ON public.anvandarroller FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));