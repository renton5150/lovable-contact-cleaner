-- Correction du warning de sécurité : définir search_path pour la fonction
DROP FUNCTION IF EXISTS get_civilite(text);

CREATE OR REPLACE FUNCTION get_civilite(prenom_input text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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