import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingStats {
  total_lines: number;
  enriched: number;
  inversions_corrected: number;
  errors: number;
  not_found: number;
}

interface Column {
  prenom?: string;
  nom?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, fileName } = await req.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Aucune donnée à traiter");
    }

    console.log(`Début du traitement de ${fileName} - ${data.length} lignes`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Détection intelligente des colonnes
    const columns = detectColumns(data[0]);
    if (!columns.prenom || !columns.nom) {
      throw new Error(
        `Colonnes non détectées. Colonnes trouvées: ${Object.keys(data[0]).join(', ')}`
      );
    }

    console.log(`Colonnes détectées - Prénom: "${columns.prenom}", Nom: "${columns.nom}"`);

    // Créer l'enregistrement dans fichiers_traites
    const { data: fichierData, error: fichierError } = await supabase
      .from('fichiers_traites')
      .insert({
        nom_fichier: fileName,
        nb_lignes_total: data.length,
        nb_lignes_traitees: 0,
        statut: 'en_cours'
      })
      .select()
      .single();

    if (fichierError) {
      console.error("Erreur création fichier:", fichierError);
      throw fichierError;
    }

    const fichier_id = fichierData.id;
    console.log(`Fichier créé avec ID: ${fichier_id}`);

    // Traiter par lots de 1000 lignes
    const processedData: any[] = [];
    const stats: ProcessingStats = {
      total_lines: data.length,
      enriched: 0,
      inversions_corrected: 0,
      errors: 0,
      not_found: 0
    };

    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));
      console.log(`Traitement du lot ${i / batchSize + 1} (${batch.length} lignes)`);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const lineNumber = i + j + 1;

        try {
          const prenom = row[columns.prenom]?.toString().trim() || '';
          const nom = row[columns.nom]?.toString().trim() || '';

          if (!prenom && !nom) {
            processedData.push({ ...row, Civilité: '' });
            continue;
          }

          // Vérifier si c'est une inversion (nom dans la colonne prénom)
          const { isInverted, correctedPrenom, correctedNom } = await checkInversion(
            supabase,
            prenom,
            nom
          );

          let finalPrenom = prenom;
          let finalNom = nom;
          let civilite = '';

          if (isInverted) {
            finalPrenom = correctedPrenom;
            finalNom = correctedNom;
            stats.inversions_corrected++;

            await supabase.from('logs_traitement').insert({
              fichier_id,
              ligne_numero: lineNumber,
              type_action: 'inversion',
              details: {
                avant: { prenom, nom },
                apres: { prenom: finalPrenom, nom: finalNom }
              }
            });

            console.log(`Ligne ${lineNumber}: Inversion corrigée "${prenom}" <-> "${nom}"`);
          }

          // Enrichir la civilité
          const { data: civiliteData } = await supabase
            .rpc('get_civilite', { prenom_input: finalPrenom });

          if (civiliteData && civiliteData !== 'Non trouvé') {
            civilite = civiliteData;
            stats.enriched++;

            await supabase.from('logs_traitement').insert({
              fichier_id,
              ligne_numero: lineNumber,
              type_action: 'enrichissement',
              details: { prenom: finalPrenom, civilite }
            });
          } else {
            stats.not_found++;

            await supabase.from('logs_traitement').insert({
              fichier_id,
              ligne_numero: lineNumber,
              type_action: 'non_trouve',
              details: { prenom: finalPrenom }
            });
          }

          processedData.push({
            ...row,
            [columns.prenom]: finalPrenom,
            [columns.nom]: finalNom,
            Civilité: civilite
          });

        } catch (error) {
          console.error(`Erreur ligne ${lineNumber}:`, error);
          stats.errors++;
          processedData.push({ ...row, Civilité: 'Erreur' });

          await supabase.from('logs_traitement').insert({
            fichier_id,
            ligne_numero: lineNumber,
            type_action: 'erreur',
            details: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      }

      // Mettre à jour la progression
      await supabase
        .from('fichiers_traites')
        .update({
          nb_lignes_traitees: Math.min(i + batchSize, data.length)
        })
        .eq('id', fichier_id);
    }

    // Finaliser
    await supabase
      .from('fichiers_traites')
      .update({
        statut: 'termine',
        nb_lignes_traitees: data.length
      })
      .eq('id', fichier_id);

    console.log('Traitement terminé:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        fichier_id,
        statistics: stats,
        processed_data: processedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur traitement:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function detectColumns(firstRow: any): Column {
  const keys = Object.keys(firstRow);
  const result: Column = {};

  // Recherche colonne prénom
  const prenomPatterns = ['prenom', 'prénom', 'firstname', 'first_name', 'first name'];
  for (const key of keys) {
    if (prenomPatterns.some(p => key.toLowerCase().includes(p))) {
      result.prenom = key;
      break;
    }
  }

  // Recherche colonne nom
  const nomPatterns = ['nom', 'name', 'lastname', 'last_name', 'last name', 'surname'];
  for (const key of keys) {
    if (nomPatterns.some(p => key.toLowerCase().includes(p))) {
      result.nom = key;
      break;
    }
  }

  return result;
}

async function checkInversion(
  supabase: any,
  prenom: string,
  nom: string
): Promise<{ isInverted: boolean; correctedPrenom: string; correctedNom: string }> {
  if (!prenom || !nom) {
    return { isInverted: false, correctedPrenom: prenom, correctedNom: nom };
  }

  // Vérifier si le "nom" existe dans reference_prenoms
  const { data: nomInRef } = await supabase
    .from('reference_prenoms')
    .select('prenom')
    .ilike('prenom', nom)
    .limit(1)
    .maybeSingle();

  // Vérifier si le "prenom" n'existe PAS dans reference_prenoms
  const { data: prenomInRef } = await supabase
    .from('reference_prenoms')
    .select('prenom')
    .ilike('prenom', prenom)
    .limit(1)
    .maybeSingle();

  if (nomInRef && !prenomInRef) {
    // Inversion détectée
    return {
      isInverted: true,
      correctedPrenom: nom,
      correctedNom: prenom
    };
  }

  return { isInverted: false, correctedPrenom: prenom, correctedNom: nom };
}
