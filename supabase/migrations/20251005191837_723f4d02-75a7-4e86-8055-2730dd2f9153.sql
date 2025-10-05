-- Ajouter les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_fichiers_traites_user_id ON fichiers_traites(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_traitement_fichier_id ON logs_traitement(fichier_id);

-- Fonction PostgreSQL optimisée pour récupérer la civilité d'un prénom
CREATE OR REPLACE FUNCTION get_civilite(prenom_input text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  civilite_result text;
BEGIN
  SELECT civilite INTO civilite_result
  FROM reference_prenoms
  WHERE LOWER(prenom) = LOWER(prenom_input)
  LIMIT 1;
  
  RETURN COALESCE(civilite_result, 'Non trouvé');
END;
$$;