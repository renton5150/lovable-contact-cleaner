import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting import process...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
    
    // Read the file content
    const content = await file.text();
    
    // Parse CSV with semicolon separator
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    console.log(`Total lines found: ${lines.length}`);
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fonction pour normaliser les civilités
    const normalizeCivilite = (civilite: string): string => {
      const cleaned = civilite.trim().toLowerCase();
      if (cleaned === 'monsieur' || cleaned === 'm' || cleaned === 'm.') return 'M.';
      if (cleaned === 'madame' || cleaned === 'mme' || cleaned === 'mme.') return 'Mme';
      return civilite.trim(); // Retourne la valeur originale si non reconnue
    };

    // Process in batches of 2000 (optimized for large files)
    const BATCH_SIZE = 2000;
    let processed = 0;
    let inserted = 0;
    let errors = 0;
    let skipped = 0;
    
    console.log(`Starting batch processing of ${dataLines.length} lines...`);
    
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      const batch = dataLines.slice(i, i + BATCH_SIZE);
      
      // Parse batch with normalization
      const records = batch.map((line, idx) => {
        const [name_first, civility_fr] = line.split(';').map(s => s.trim());
        
        if (!name_first || !civility_fr) {
          return null; // Will be filtered out
        }
        
        return {
          prenom: name_first,
          civilite: normalizeCivilite(civility_fr)
        };
      }).filter(r => r !== null); // Filter out invalid lines
      
      skipped += (batch.length - records.length);
      
      if (records.length === 0) {
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: No valid records, skipping`);
        processed += batch.length;
        continue;
      }
      
      // Insert batch with upsert (ON CONFLICT DO UPDATE)
      const { error } = await supabase
        .from('reference_prenoms')
        .upsert(records, {
          onConflict: 'prenom',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error);
        errors += records.length;
      } else {
        inserted += records.length;
      }
      
      processed += batch.length;
      
      // Log progress every 5 batches (every 10,000 lines)
      if ((i / BATCH_SIZE) % 5 === 0) {
        const percentage = ((processed / dataLines.length) * 100).toFixed(1);
        console.log(`Progress: ${processed}/${dataLines.length} (${percentage}%) - Inserted: ${inserted}, Errors: ${errors}, Skipped: ${skipped}`);
      }
    }
    
    const result = {
      success: true,
      total_lines: dataLines.length,
      processed,
      inserted,
      errors,
      skipped,
      message: `Import terminé: ${inserted} prénoms insérés, ${errors} erreurs, ${skipped} lignes ignorées`
    };
    
    console.log('Import completed:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
