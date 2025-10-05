import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileProcessed: (data: any[], fileName: string) => void;
}

export const FileUploader = ({ onFileProcessed }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Support CSV européen
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          onFileProcessed(results.data, file.name);
          toast({
            title: "Fichier importé",
            description: `${results.data.length} lignes détectées`,
          });
        }
        setIsProcessing(false);
      },
      error: (error) => {
        toast({
          title: "Erreur",
          description: `Erreur lors de la lecture du fichier: ${error.message}`,
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  };

  const processExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        if (jsonData && jsonData.length > 0) {
          onFileProcessed(jsonData, file.name);
          toast({
            title: "Fichier importé",
            description: `${jsonData.length} lignes détectées`,
          });
        }
        setIsProcessing(false);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Erreur lors de la lecture du fichier Excel",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = useCallback((file: File) => {
    setIsProcessing(true);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      processCSV(file);
    } else if (["xlsx", "xls"].includes(extension || "")) {
      processExcel(file);
    } else {
      toast({
        title: "Format non supporté",
        description: "Veuillez importer un fichier CSV, XLSX ou XLS",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }, [onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <Card
      className={`
        relative overflow-hidden transition-all duration-300
        ${isDragging ? "border-primary shadow-medium scale-[1.02]" : "border-border hover:border-primary/50"}
        ${isProcessing ? "opacity-50 pointer-events-none" : ""}
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-12 text-center">
        <div className="mx-auto w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <Upload className="w-10 h-10 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isProcessing ? "Traitement en cours..." : "Importer un fichier"}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          Glissez-déposez votre fichier ici ou cliquez pour sélectionner
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx, .xls)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>CSV</span>
          </div>
        </div>

        <label className="inline-block">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />
          <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-105">
            Sélectionner un fichier
          </span>
        </label>
      </div>
    </Card>
  );
};
