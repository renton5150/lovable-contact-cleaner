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
    
    // Process in batches of 1000
    const BATCH_SIZE = 1000;
    let processed = 0;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      const batch = dataLines.slice(i, i + BATCH_SIZE);
      
      // Parse batch
      const records = batch.map(line => {
        const [name_first, civility_fr] = line.split(';').map(s => s.trim());
        return {
          prenom: name_first,
          civilite: civility_fr
        };
      }).filter(r => r.prenom && r.civilite); // Filter out invalid lines
      
      // Insert batch with upsert (ON CONFLICT DO UPDATE)
      const { data, error } = await supabase
        .from('reference_prenoms')
        .upsert(records, {
          onConflict: 'prenom',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Batch error at line ${i}:`, error);
        errors += batch.length;
      } else {
        inserted += records.length;
      }
      
      processed += batch.length;
      
      // Log progress every 10 batches
      if (i % (BATCH_SIZE * 10) === 0) {
        console.log(`Progress: ${processed}/${dataLines.length} lines processed`);
      }
    }
    
    const result = {
      success: true,
      total_lines: dataLines.length,
      processed,
      inserted,
      errors,
      message: `Import completed: ${inserted} prenoms inserted, ${errors} errors`
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
