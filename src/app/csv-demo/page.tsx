'use client';

import { useState } from 'react';
import CSVProcessor from '@/components/ui/CSVProcessor';
import { type ProcessedMessage } from '@/lib/csvUtils';

export default function CSVDemoPage() {
  const [messageTemplate, setMessageTemplate] = useState<string>('');
  const [processedMessages, setProcessedMessages] = useState<ProcessedMessage[]>([]);
  const [error, setError] = useState<string>('');

  const handleProcessedMessages = (messages: ProcessedMessage[]) => {
    setProcessedMessages(messages);
    setError('');
  };

  const handleError = (message: string) => {
    setError(message);
    setProcessedMessages([]);
  };

  const handleSendMessages = () => {
    if (processedMessages.length === 0) {
      setError('No messages to send');
      return;
    }

    // Here you would typically send the messages to your API
    console.log('Sending messages:', processedMessages);
    alert(`Ready to send ${processedMessages.length} personalized messages!`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-github-fg-default mb-4">
          CSV Message Processor Demo
        </h1>
        <p className="text-github-fg-muted">
          Upload a CSV file and create personalized messages using placeholders.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Message Template */}
        <div className="space-y-6">
          <div className="bg-github-canvas-default rounded-lg p-6 border border-github-border-muted">
            <h2 className="text-xl font-semibold text-github-fg-default mb-4">
              Message Template
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-github-fg-default mb-2">
                  Enter your message template with placeholders
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Hi {{Name}}, your group is {{Group Name}} and your student number is {{Student Number}}"
                  className="w-full h-32 p-3 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-github-fg-default mb-2">
                  Available Placeholders
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Name', 'Phone', 'Student Number', 'Group Name', 'Code', 'Password'].map((placeholder) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue = messageTemplate.substring(0, start) + 
                                         `{{${placeholder}}}` + 
                                         messageTemplate.substring(end);
                          setMessageTemplate(newValue);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-github-canvas-subtle text-github-fg-default border border-github-border-muted rounded hover:bg-github-canvas-inset transition-colors"
                    >
                      {placeholder}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-github-fg-muted mt-2">
                  Click any placeholder to insert it into your message
                </p>
              </div>
            </div>
          </div>

          {/* Sample CSV */}
          <div className="bg-github-canvas-default rounded-lg p-6 border border-github-border-muted">
            <h2 className="text-xl font-semibold text-github-fg-default mb-4">
              Sample CSV Format
            </h2>
            
            <div className="bg-github-canvas-subtle rounded p-3">
              <pre className="text-xs text-github-fg-muted whitespace-pre-wrap">
{`Phone,Name,Student Number,Group Name,Code,Password
01122267427,Ahmed Kabary,11,Saturday 8,3256888,12345
01061370451,Sarah Johnson,12,Sunday 9,3256889,67890`}
              </pre>
            </div>
            
            <p className="text-xs text-github-fg-muted mt-2">
              Download this sample CSV to test the functionality
            </p>
            
            <button
              type="button"
              onClick={() => {
                const csvContent = `Phone,Name,Student Number,Group Name,Code,Password
01122267427,Ahmed Kabary,11,Saturday 8,3256888,12345
01061370451,Sarah Johnson,12,Sunday 9,3256889,67890`;
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sample_students.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="mt-3 px-4 py-2 bg-[#1f6feb] text-white rounded hover:bg-[#1a5feb] transition-colors text-sm"
            >
              Download Sample CSV
            </button>
          </div>
        </div>

        {/* Right Column - CSV Processor */}
        <div>
          <CSVProcessor
            messageTemplate={messageTemplate}
            onProcessedMessages={handleProcessedMessages}
            onError={handleError}
          />
        </div>
      </div>

      {/* Send Messages Section */}
      {processedMessages.length > 0 && (
        <div className="mt-8 bg-github-canvas-default rounded-lg p-6 border border-github-border-muted">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-github-fg-default">
              Ready to Send ({processedMessages.length} messages)
            </h2>
            <button
              type="button"
              onClick={handleSendMessages}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Send Messages
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {processedMessages.map((message, index) => (
              <div key={index} className="bg-github-canvas-subtle rounded p-3 border border-github-border-muted">
                <div className="text-xs text-github-fg-muted mb-2">
                  To: {message.phoneNumber}
                </div>
                <div className="text-sm text-github-fg-default whitespace-pre-wrap">
                  {message.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 