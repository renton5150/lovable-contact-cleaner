-- Optimiser la table reference_prenoms pour l'import et les recherches
-- Rendre prenom PRIMARY KEY pour éviter les doublons automatiquement
ALTER TABLE reference_prenoms DROP CONSTRAINT IF EXISTS reference_prenoms_pkey;
ALTER TABLE reference_prenoms ADD PRIMARY KEY (prenom);

-- Index pour recherche insensible à la casse (performance cruciale)
CREATE INDEX IF NOT EXISTS idx_reference_prenoms_prenom_lower 
ON reference_prenoms(LOWER(prenom));

-- Politique RLS pour insertion publique (mode admin unique, pas d'auth)
DROP POLICY IF EXISTS "Anyone can read reference prenoms" ON reference_prenoms;
CREATE POLICY "Anyone can read reference prenoms" 
ON reference_prenoms FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert reference prenoms" 
ON reference_prenoms FOR INSERT TO public WITH CHECK (true);