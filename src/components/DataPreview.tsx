import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Download, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";

interface DataPreviewProps {
  data: any[];
  fileName: string;
}

interface ProcessingStats {
  total_lines: number;
  enriched: number;
  inversions_corrected: number;
  errors: number;
  not_found: number;
}

export const DataPreview = ({ data, fileName }: DataPreviewProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statistics, setStatistics] = useState<ProcessingStats | null>(null);
  const [processedData, setProcessedData] = useState<any[] | null>(null);
  const { toast } = useToast();

  if (!data || data.length === 0) return null;

  const displayData = processedData || data;
  const previewData = displayData.slice(0, 10);
  const columns = Object.keys(previewData[0]);

  const handleEnrichment = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Simuler la progression pendant le traitement
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      const { data: result, error } = await supabase.functions.invoke('process-contact-file', {
        body: { data, fileName }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (result.success) {
        setProgress(100);
        setStatistics(result.statistics);
        setProcessedData(result.processed_data);
        
        toast({
          title: "Enrichissement terminé !",
          description: `${result.statistics.enriched} contacts enrichis, ${result.statistics.inversions_corrected} inversions corrigées`,
        });
      } else {
        throw new Error(result.error || "Erreur inconnue");
      }
    } catch (error: any) {
      console.error('Erreur enrichissement:', error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'enrichissement",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedData) return;

    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts enrichis");
    
    const exportFileName = fileName.replace(/\.(csv|xlsx)$/i, '_enrichi.xlsx');
    XLSX.writeFile(workbook, exportFileName);

    toast({
      title: "Téléchargement",
      description: "Fichier enrichi téléchargé avec succès",
    });
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Aperçu des données</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {fileName} - {displayData.length} ligne{displayData.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex gap-2">
          {processedData && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          )}
          {!processedData && (
            <Button 
              onClick={handleEnrichment} 
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isProcessing ? "Traitement..." : "Enrichissement intelligent"}
            </Button>
          )}
        </div>
      </div>

      {isProcessing && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Traitement en cours...</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {statistics && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Statistiques du traitement</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{statistics.total_lines}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Enrichis</p>
              <p className="text-2xl font-bold text-green-600">{statistics.enriched}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inversions</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.inversions_corrected}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Non trouvés</p>
              <p className="text-2xl font-bold text-amber-600">{statistics.not_found}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <ScrollArea className="w-full">
          <div className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="font-semibold whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="whitespace-nowrap">
                        {row[col]?.toString() || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </Card>

      {displayData.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          Affichage des 10 premières lignes sur {displayData.length}
        </p>
      )}
    </div>
  );
};
