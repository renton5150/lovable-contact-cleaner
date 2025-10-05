import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { DataPreview } from "@/components/DataPreview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Sparkles, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileProcessed = (data: any[], name: string) => {
    setUploadedData(data);
    setFileName(name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Enrichisseur de Contacts
              </h1>
            </div>
            <Link to="/admin/import">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Import Base
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-accent-foreground text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Enrichissement automatique de données</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Enrichissez et corrigez vos
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                bases de contacts
              </span>
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ajoutez automatiquement la civilité et corrigez les inversions Prénom/Nom
              dans vos fichiers de contacts en quelques secondes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 animate-slide-up">
            {[
              {
                title: "Enrichissement intelligent",
                description: "Ajout automatique de la civilité basé sur 500K+ prénoms",
                icon: "🎯",
              },
              {
                title: "Correction d'inversions",
                description: "Détection et correction des champs Prénom/Nom inversés",
                icon: "🔄",
              },
              {
                title: "Export optimisé",
                description: "Récupérez votre fichier nettoyé et enrichi",
                icon: "📊",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="p-6 hover:shadow-medium transition-all duration-300 hover:scale-105 bg-card/50 backdrop-blur-sm border-border/50"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          {/* File Upload Section */}
          <div className="animate-scale-in">
            <FileUploader onFileProcessed={handleFileProcessed} />
          </div>

          {/* Data Preview Section */}
          {uploadedData && (
            <DataPreview data={uploadedData} fileName={fileName} />
          )}

          {/* Files Section Placeholder */}
          {!uploadedData && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Database className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucun fichier importé</h3>
              <p className="text-muted-foreground">
                Importez votre premier fichier pour commencer l'enrichissement
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
