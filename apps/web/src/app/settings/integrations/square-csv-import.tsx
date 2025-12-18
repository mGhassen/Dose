"use client";

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@kit/hooks';
import Papa from 'papaparse';

interface SquareCsvImportProps {
  integrationId: string;
  onImportComplete?: () => void;
}

export default function SquareCsvImport({ integrationId, onImportComplete }: SquareCsvImportProps) {
  const [importType, setImportType] = useState<'orders' | 'payments' | 'catalog'>('orders');
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Parse CSV
      const text = await file.text();
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
      }

      const rows = parseResult.data as any[];
      
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Import via API
      const response = await fetch(`/api/integrations/${integrationId}/square/import-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          import_type: importType,
          data: rows,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();
      setImportResult(result);

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.success} records. ${result.errors > 0 ? `${result.errors} errors.` : ''}`,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import CSV data',
        variant: 'destructive',
      });
      setImportResult({ success: 0, errors: 1 });
    } finally {
      setIsImporting(false);
    }
  };

  const getCsvTemplate = () => {
    let headers: string[] = [];
    let sampleRow: string[] = [];

    switch (importType) {
      case 'orders':
        headers = ['id', 'location_id', 'reference_id', 'created_at', 'updated_at', 'state', 'total_amount', 'total_amount_currency'];
        sampleRow = ['order_123', 'location_456', 'REF001', '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z', 'COMPLETED', '2500', 'USD'];
        break;
      case 'payments':
        headers = ['id', 'location_id', 'order_id', 'created_at', 'amount', 'currency', 'status', 'source_type'];
        sampleRow = ['payment_123', 'location_456', 'order_123', '2024-01-15T10:30:00Z', '2500', 'USD', 'COMPLETED', 'CARD'];
        break;
      case 'catalog':
        headers = ['id', 'type', 'name', 'description', 'price', 'currency', 'category_id'];
        sampleRow = ['item_123', 'ITEM', 'Coffee', 'Hot coffee drink', '500', 'USD', 'cat_123'];
        break;
    }

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `square-${importType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Import Type</Label>
        <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Orders</SelectItem>
            <SelectItem value="payments">Payments</SelectItem>
            <SelectItem value="catalog">Catalog Items</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>CSV File</Label>
        <div className="mt-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-file-input"
          />
          <label
            htmlFor="csv-file-input"
            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to select CSV file</span>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={getCsvTemplate}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          Download Template
        </Button>
        <Button
          onClick={handleImport}
          disabled={!file || isImporting}
          className="flex-1"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </>
          )}
        </Button>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg border ${importResult.errors > 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 'border-green-500 bg-green-50 dark:bg-green-950'}`}>
          <div className="flex items-center gap-2">
            {importResult.errors === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                Imported {importResult.success} record{importResult.success !== 1 ? 's' : ''}
              </p>
              {importResult.errors > 0 && (
                <p className="text-sm text-muted-foreground">
                  {importResult.errors} error{importResult.errors !== 1 ? 's' : ''} occurred
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>CSV Format:</strong></p>
        <p>• First row must contain column headers</p>
        <p>• Dates should be in ISO format (YYYY-MM-DDTHH:mm:ssZ)</p>
        <p>• Amounts should be in cents (e.g., $25.00 = 2500)</p>
        <p>• Download template for exact column names</p>
      </div>
    </div>
  );
}



