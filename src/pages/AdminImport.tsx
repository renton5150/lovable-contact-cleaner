import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setResult(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 500);

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('import-reference-prenoms', {
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Import réussi !",
        description: `${data.inserted} prénoms importés avec succès`,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
      setResult({ success: false, error: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Import Base de Référence</h1>
          <p className="text-muted-foreground">
            Importez le fichier CSV des prénoms de référence (format: prenom;civilite)
          </p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-6 rounded-full bg-primary/10">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Sélectionner le fichier CSV</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Format attendu: name_first;civility_fr
              </p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="csv-upload"
            />
            
            <label htmlFor="csv-upload">
              <Button 
                disabled={isUploading}
                size="lg"
                asChild
              >
                <span>
                  {isUploading ? "Import en cours..." : "Choisir un fichier"}
                </span>
              </Button>
            </label>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {result && (
            <div className={`p-6 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-lg">
                    {result.success ? 'Import réussi' : 'Erreur d\'import'}
                  </h4>
                  
                  {result.success && (
                    <div className="space-y-1 text-sm">
                      <p>✓ Total de lignes traitées: <strong>{result.processed}</strong></p>
                      <p>✓ Prénoms insérés/mis à jour: <strong>{result.inserted}</strong></p>
                      {result.skipped > 0 && (
                        <p className="text-muted-foreground">ℹ Lignes ignorées: <strong>{result.skipped}</strong></p>
                      )}
                      {result.errors > 0 && (
                        <p className="text-orange-600">⚠ Erreurs: <strong>{result.errors}</strong></p>
                      )}
                    </div>
                  )}
                  
                  {result.error && (
                    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
