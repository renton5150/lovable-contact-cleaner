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

interface DataPreviewProps {
  data: any[];
  fileName: string;
}

export const DataPreview = ({ data, fileName }: DataPreviewProps) => {
  if (!data || data.length === 0) return null;

  const previewData = data.slice(0, 10);
  const columns = Object.keys(previewData[0]);

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Aperçu des données</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {fileName} - {data.length} ligne{data.length > 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

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

      {data.length > 10 && (
        <p className="text-sm text-muted-foreground text-center">
          Affichage des 10 premières lignes sur {data.length}
        </p>
      )}
    </div>
  );
};
