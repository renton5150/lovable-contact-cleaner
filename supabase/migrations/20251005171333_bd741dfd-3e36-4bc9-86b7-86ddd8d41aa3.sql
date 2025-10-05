-- Create reference_prenoms table
CREATE TABLE public.reference_prenoms (
  prenom TEXT PRIMARY KEY,
  civilite TEXT NOT NULL CHECK (civilite IN ('Monsieur', 'Madame'))
);

-- Create index for fast lookups
CREATE INDEX idx_reference_prenoms_prenom ON public.reference_prenoms(prenom);

-- Enable RLS
ALTER TABLE public.reference_prenoms ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
CREATE POLICY "Anyone can read reference prenoms"
  ON public.reference_prenoms
  FOR SELECT
  USING (true);

-- Create fichiers_traites table
CREATE TABLE public.fichiers_traites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_fichier TEXT NOT NULL,
  date_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'termine', 'erreur')),
  nb_lignes_total INTEGER NOT NULL DEFAULT 0,
  nb_lignes_traitees INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE public.fichiers_traites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own files
CREATE POLICY "Users can view their own files"
  ON public.fichiers_traites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON public.fichiers_traites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.fichiers_traites
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create logs_traitement table
CREATE TABLE public.logs_traitement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier_id UUID REFERENCES public.fichiers_traites(id) ON DELETE CASCADE NOT NULL,
  ligne_numero INTEGER NOT NULL,
  type_action TEXT NOT NULL CHECK (type_action IN ('enrichissement', 'correction_inversion', 'erreur')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logs_traitement ENABLE ROW LEVEL SECURITY;

-- Users can only see logs for their own files
CREATE POLICY "Users can view logs for their own files"
  ON public.logs_traitement
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fichiers_traites
      WHERE fichiers_traites.id = logs_traitement.fichier_id
      AND fichiers_traites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for their own files"
  ON public.logs_traitement
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fichiers_traites
      WHERE fichiers_traites.id = logs_traitement.fichier_id
      AND fichiers_traites.user_id = auth.uid()
    )
  );