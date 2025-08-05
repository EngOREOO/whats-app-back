import React, { useState, useCallback } from 'react';
import {
  processCSVWithTemplate,
  extractPlaceholders,
  validatePlaceholders,
  createDefaultMapping,
  type CSVRow,
  type ProcessedMessage,
  type PlaceholderMapping
} from '@/lib/csvUtils';

interface CSVProcessorProps {
  onProcessedMessages: (messages: ProcessedMessage[]) => void;
  onError: (message: string) => void;
  messageTemplate: string;
}

export default function CSVProcessor({
  onProcessedMessages,
  onError,
  messageTemplate
}: CSVProcessorProps) {
  const [csvContent, setCsvContent] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedMessages, setProcessedMessages] = useState<ProcessedMessage[]>([]);
  const [mapping, setMapping] = useState<PlaceholderMapping>({});
  const [showMapping, setShowMapping] = useState<boolean>(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      onError('Please upload a CSV or TXT file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      onError('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      
      // Parse CSV to get headers and preview
      try {
        const lines = content.trim().split('\n');
        if (lines.length === 0) {
          onError('CSV file is empty');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        setCsvHeaders(headers);

        // Parse first few rows for preview
        const previewRows = lines.slice(1, 4).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: CSVRow = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });
        setCsvRows(previewRows);

        // Create default mapping
        const defaultMapping = createDefaultMapping(headers);
        setMapping(defaultMapping);

      } catch (error) {
        onError('Error parsing CSV file');
        console.error('CSV parsing error:', error);
      }
    };

    reader.readAsText(file);
  }, [onError]);

  // Process CSV with template
  const processCSV = useCallback(() => {
    if (!csvContent || !messageTemplate) {
      onError('Please upload a CSV file and enter a message template');
      return;
    }

    setIsProcessing(true);

    try {
      // Extract placeholders from template
      const placeholders = extractPlaceholders(messageTemplate);
      
      if (placeholders.length === 0) {
        onError('No placeholders found in message template. Use {{PlaceholderName}} format.');
        setIsProcessing(false);
        return;
      }

      // Validate placeholders
      const missingPlaceholders = validatePlaceholders(messageTemplate, csvHeaders, mapping);
      
      if (missingPlaceholders.length > 0) {
        onError(`Missing data for placeholders: ${missingPlaceholders.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // Process CSV with template
      const messages = processCSVWithTemplate(csvContent, messageTemplate, {
        hasHeaders,
        customMapping: mapping,
        phoneNumberColumn: 'Phone',
        autoFormatPhoneNumbers: true
      });

      if (messages.length === 0) {
        onError('No valid data found in CSV file');
        setIsProcessing(false);
        return;
      }

      setProcessedMessages(messages);
      onProcessedMessages(messages);

    } catch (error) {
      onError('Error processing CSV file');
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [csvContent, messageTemplate, hasHeaders, mapping, csvHeaders, onProcessedMessages, onError]);

  // Update mapping
  const updateMapping = useCallback((placeholderKey: string, csvColumn: string) => {
    setMapping(prev => ({
      ...prev,
      [placeholderKey]: csvColumn
    }));
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setCsvContent('');
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setProcessedMessages([]);
    onProcessedMessages([]);
  }, [onProcessedMessages]);

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
        <h3 className="text-lg font-medium text-github-fg-default mb-4">Upload CSV File</h3>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-github-fg-default mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-github-fg-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-github-canvas-subtle file:text-github-fg-default hover:file:bg-github-canvas-inset"
            />
            <p className="text-xs text-github-fg-muted mt-1">
              Supported formats: CSV, TXT (max 5MB)
            </p>
          </div>

          {/* Headers Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasHeaders"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="rounded border-github-border-muted text-[#1f6feb] focus:ring-[#1f6feb]"
            />
            <label htmlFor="hasHeaders" className="text-sm text-github-fg-default">
              CSV file has headers (first row contains column names)
            </label>
          </div>
        </div>
      </div>

      {/* CSV Preview Section */}
      {csvHeaders.length > 0 && (
        <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
          <h3 className="text-lg font-medium text-github-fg-default mb-4">CSV Preview</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-github-border-muted">
                  {csvHeaders.map((header, index) => (
                    <th key={index} className="text-left py-2 px-3 text-github-fg-default font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-github-border-muted">
                    {csvHeaders.map((header, colIndex) => (
                      <td key={colIndex} className="py-2 px-3 text-github-fg-muted">
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-github-fg-muted mt-2">
            Showing first {csvRows.length} rows of data
          </p>
        </div>
      )}

      {/* Placeholder Mapping Section */}
      {csvHeaders.length > 0 && messageTemplate && (
        <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-github-fg-default">Placeholder Mapping</h3>
            <button
              type="button"
              onClick={() => setShowMapping(!showMapping)}
              className="text-sm text-[#1f6feb] hover:text-[#1a5feb] transition-colors"
            >
              {showMapping ? 'Hide Mapping' : 'Show Mapping'}
            </button>
          </div>

          {showMapping && (
            <div className="space-y-3">
              {extractPlaceholders(messageTemplate).map((placeholder) => (
                                 <div key={placeholder} className="flex items-center space-x-3">
                   <span className="text-sm font-medium text-github-fg-default min-w-[120px]">
                     {`{{${placeholder}}}`}
                   </span>
                  <span className="text-sm text-github-fg-muted">→</span>
                  <select
                    value={mapping[placeholder] || ''}
                    onChange={(e) => updateMapping(placeholder, e.target.value)}
                    className="flex-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded px-3 py-1 text-github-fg-default focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                  >
                    <option value="">Select CSV column</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={processCSV}
          disabled={!csvContent || !messageTemplate || isProcessing}
          className="px-4 py-2 bg-[#1f6feb] text-white rounded hover:bg-[#1a5feb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Process CSV'}
        </button>
        
        <button
          type="button"
          onClick={clearData}
          className="px-4 py-2 bg-github-canvas-subtle text-github-fg-default border border-github-border-muted rounded hover:bg-github-canvas-inset transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Results Section */}
      {processedMessages.length > 0 && (
        <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
          <h3 className="text-lg font-medium text-github-fg-default mb-4">
            Processed Messages ({processedMessages.length} total)
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {processedMessages.slice(0, 5).map((message, index) => (
              <div key={index} className="border-l-4 border-[#1f6feb] pl-3">
                <div className="text-xs text-github-fg-muted mb-1">
                  Row {message.rowIndex + 1} • To: {message.phoneNumber}
                </div>
                <div className="text-sm text-github-fg-default whitespace-pre-wrap">
                  {message.message}
                </div>
              </div>
            ))}
            
            {processedMessages.length > 5 && (
              <div className="text-xs text-github-fg-muted text-center">
                ... and {processedMessages.length - 5} more messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 