-- Rendre user_id nullable dans fichiers_traites
ALTER TABLE fichiers_traites 
ALTER COLUMN user_id DROP NOT NULL;

-- Modifier les RLS policies de fichiers_traites pour accès public
DROP POLICY IF EXISTS "Users can insert their own files" ON fichiers_traites;
CREATE POLICY "Anyone can insert files" ON fichiers_traites
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own files" ON fichiers_traites;
CREATE POLICY "Anyone can update files" ON fichiers_traites
  FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own files" ON fichiers_traites;
CREATE POLICY "Anyone can view files" ON fichiers_traites
  FOR SELECT TO anon, authenticated
  USING (true);

-- Modifier les RLS policies de logs_traitement pour accès public
DROP POLICY IF EXISTS "Users can insert logs for their own files" ON logs_traitement;
CREATE POLICY "Anyone can insert logs" ON logs_traitement
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view logs for their own files" ON logs_traitement;
CREATE POLICY "Anyone can view logs" ON logs_traitement
  FOR SELECT TO anon, authenticated
  USING (true);