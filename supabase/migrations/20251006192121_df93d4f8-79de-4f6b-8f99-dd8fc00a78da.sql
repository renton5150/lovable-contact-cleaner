-- Drop the old check constraint that only accepts "Monsieur" and "Madame"
ALTER TABLE public.reference_prenoms 
DROP CONSTRAINT IF EXISTS reference_prenoms_civilite_check;

-- Add new check constraint that accepts normalized values "M." and "Mme"
ALTER TABLE public.reference_prenoms 
ADD CONSTRAINT reference_prenoms_civilite_check 
CHECK (civilite = ANY (ARRAY['M.', 'Mme']));

-- Add comment to document the expected values
COMMENT ON COLUMN public.reference_prenoms.civilite IS 'Civilité normalisée: M. pour Monsieur, Mme pour Madame';