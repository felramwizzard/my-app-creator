import { useState, useRef } from "react";
import { FinanceLayout } from "@/components/layout/FinanceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/hooks/useFinance";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import type { ParsedTransaction, CSVColumnMapping } from "@/types/finance";
import { cn } from "@/lib/utils";
import { TransactionItem } from "@/components/finance/TransactionItem";
import type { Transaction } from "@/types/finance";

export default function ImportPage() {
  const { currentCycle, transactions, createTransaction } = useFinance();
  
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'done'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    date: '',
    description: '',
    amount: ''
  });
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = lines.map(line => {
        // Handle quoted CSV values
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        return matches.map(m => m.replace(/^"|"$/g, '').trim());
      });

      if (parsed.length > 1) {
        setHeaders(parsed[0]);
        setCsvData(parsed.slice(1));
        setStep('map');
      } else {
        toast.error("CSV file appears to be empty or invalid");
      }
    };
    reader.readAsText(file);
  };

  const handleMapping = () => {
    if (!mapping.date || !mapping.description || (!mapping.amount && !mapping.debit)) {
      toast.error("Please map all required columns");
      return;
    }

    const dateIdx = headers.indexOf(mapping.date);
    const descIdx = headers.indexOf(mapping.description);
    const amountIdx = mapping.amount ? headers.indexOf(mapping.amount) : -1;
    const debitIdx = mapping.debit ? headers.indexOf(mapping.debit) : -1;
    const creditIdx = mapping.credit ? headers.indexOf(mapping.credit) : -1;

    // Parse existing transaction hashes for deduplication
    const existingHashes = new Set(transactions.map(t => t.import_hash).filter(Boolean));

    const parsed: ParsedTransaction[] = csvData.map(row => {
      const dateStr = row[dateIdx];
      const description = row[descIdx];
      
      let amount = 0;
      if (amountIdx >= 0) {
        amount = parseFloat(row[amountIdx].replace(/[$,]/g, '')) || 0;
      } else {
        const debit = debitIdx >= 0 ? parseFloat(row[debitIdx].replace(/[$,]/g, '')) || 0 : 0;
        const credit = creditIdx >= 0 ? parseFloat(row[creditIdx].replace(/[$,]/g, '')) || 0 : 0;
        amount = credit - debit;
      }

      // Parse date
      let parsedDate: Date;
      try {
        // Try common date formats
        const parts = dateStr.split(/[\/\-]/);
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          parsedDate = new Date(dateStr);
        } else if (parseInt(parts[0]) > 12) {
          // DD/MM/YYYY (Australian format)
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          // MM/DD/YYYY
          parsedDate = new Date(dateStr);
        }
      } catch {
        parsedDate = new Date();
      }

      // Create hash for deduplication
      const hash = `${format(parsedDate, 'yyyy-MM-dd')}-${description}-${amount}`;

      return {
        date: format(parsedDate, 'yyyy-MM-dd'),
        description,
        amount,
        merchant: description.split(' ')[0],
        isDuplicate: existingHashes.has(hash)
      };
    }).filter(t => t.description && !isNaN(new Date(t.date).getTime()));

    setParsedTransactions(parsed);
    setStep('review');
  };

  const handleImport = async () => {
    if (!currentCycle) {
      toast.error("No active cycle");
      return;
    }

    const toImport = parsedTransactions.filter(t => !t.isDuplicate);
    if (toImport.length === 0) {
      toast.error("No new transactions to import");
      return;
    }

    setImporting(true);
    let imported = 0;
    
    try {
      for (const t of toImport) {
        const hash = `${t.date}-${t.description}-${t.amount}`;
        await createTransaction.mutateAsync({
          cycle_id: currentCycle.id,
          date: t.date,
          description: t.description,
          merchant: t.merchant || null,
          amount: t.amount,
          category_id: null,
          method: 'csv',
          notes: null,
          split_group_id: null,
          import_hash: hash
        });
        imported++;
      }

      toast.success(`Imported ${imported} transactions`);
      setStep('done');
    } catch (error) {
      console.error("Import error:", error);
      toast.error(`Imported ${imported} transactions before error`);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({ date: '', description: '', amount: '' });
    setParsedTransactions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <FinanceLayout>
      <div className="px-5 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Import CSV</h1>
          <p className="text-sm text-muted-foreground">
            Upload your bank statement
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {['upload', 'map', 'review', 'done'].map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                ['upload', 'map', 'review', 'done'].indexOf(step) >= i 
                  ? "bg-primary" 
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6 animate-fade-in">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="glass-card rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">Upload CSV file</p>
              <p className="text-sm text-muted-foreground">
                Click to browse or drag and drop
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step: Map Columns */}
        {step === 'map' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Found {csvData.length} rows with {headers.length} columns
              </p>
              <div className="flex flex-wrap gap-2">
                {headers.slice(0, 6).map(h => (
                  <span key={h} className="px-2 py-1 text-xs bg-secondary rounded">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date Column *</Label>
                <select
                  value={mapping.date}
                  onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select column</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Description Column *</Label>
                <select
                  value={mapping.description}
                  onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select column</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Amount Column (or use Debit/Credit below)</Label>
                <select
                  value={mapping.amount || ''}
                  onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select column</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Debit Column</Label>
                  <select
                    value={mapping.debit || ''}
                    onChange={(e) => setMapping({ ...mapping, debit: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Select column</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Credit Column</Label>
                  <select
                    value={mapping.credit || ''}
                    onChange={(e) => setMapping({ ...mapping, credit: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Select column</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={resetImport} className="flex-1">
                Back
              </Button>
              <Button onClick={handleMapping} className="flex-1">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{parsedTransactions.length} transactions</p>
                <p className="text-sm text-muted-foreground">
                  {parsedTransactions.filter(t => t.isDuplicate).length} duplicates will be skipped
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {parsedTransactions.slice(0, 20).map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-xl border",
                    t.isDuplicate 
                      ? "opacity-50 border-warning/30 bg-warning/5" 
                      : "border-border/50 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        t.amount >= 0 ? "metric-positive" : "metric-negative"
                      )}>
                        ${Math.abs(t.amount).toFixed(2)}
                      </p>
                      {t.isDuplicate && (
                        <p className="text-xs text-warning">Duplicate</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {parsedTransactions.length > 20 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  And {parsedTransactions.length - 20} more...
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('map')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                className="flex-1"
                disabled={importing}
              >
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {parsedTransactions.filter(t => !t.isDuplicate).length}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="space-y-6 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold mb-2">Import Complete!</h2>
              <p className="text-muted-foreground">
                Your transactions have been imported successfully.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={resetImport} className="flex-1">
                Import More
              </Button>
              <Button onClick={() => window.location.href = '/transactions'} className="flex-1">
                View Transactions
              </Button>
            </div>
          </div>
        )}
      </div>
    </FinanceLayout>
  );
}
