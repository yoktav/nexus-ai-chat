'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface DebugInfo {
  hasApiKey: boolean;
  hasAssistantId: boolean;
  assistantVerification?: any;
  configuredAssistantId?: string;
  assistantExists?: boolean;
  assistantInList?: boolean;
  assistantError?: string;
  assistantDetails?: any;
  availableAssistants?: any[];
  error?: string;
  details?: string;
}

export default function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileId, setFileId] = useState('');
  const [fileVerification, setFileVerification] = useState<any>(null);
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);

  const fetchDebugInfo = async () => {
    setIsLoading(true);
    try {
      const [debugResponse, verifyResponse] = await Promise.all([
        fetch('/api/debug'),
        fetch('/api/verify-assistant')
      ]);
      
      const debugData = await debugResponse.json();
      const verifyData = await verifyResponse.json();
      
      setDebugInfo({
        ...debugData,
        assistantVerification: verifyData
      });
    } catch (error) {
      console.error('Debug fetch failed:', error);
      setDebugInfo({ 
        hasApiKey: false, 
        hasAssistantId: false, 
        error: 'Failed to fetch debug info' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const verifyFile = async () => {
    if (!fileId.trim()) return;
    
    setIsVerifyingFile(true);
    try {
      const response = await fetch('/api/verify-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileId.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileVerification(data);
      } else {
        const errorText = await response.text();
        setFileVerification({ error: errorText });
      }
    } catch (error) {
      setFileVerification({ error: 'Failed to verify file' });
    } finally {
      setIsVerifyingFile(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">OpenAI Configuration Debug</h3>
        <Button 
          onClick={fetchDebugInfo} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Check Configuration
        </Button>
      </div>

      {debugInfo && (
        <div className="space-y-4">
          {/* Configuration Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.hasApiKey)}
              <span>API Key Configured</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.hasAssistantId)}
              <span>Assistant ID Configured</span>
            </div>
          </div>

          {/* Assistant Details */}
          {debugInfo.configuredAssistantId && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(debugInfo.assistantExists)}
                <span>Assistant Exists: </span>
                <Badge variant={debugInfo.assistantExists ? "default" : "destructive"}>
                  {debugInfo.assistantExists ? "Found" : "Not Found"}
                </Badge>
              </div>
              
              {debugInfo.assistantInList !== undefined && (
                <div className="flex items-center gap-2">
                  {getStatusIcon(debugInfo.assistantInList)}
                  <span>Assistant in List: </span>
                  <Badge variant={debugInfo.assistantInList ? "default" : "destructive"}>
                    {debugInfo.assistantInList ? "Found" : "Not Found"}
                  </Badge>
                </div>
              )}
              
              {debugInfo.assistantError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  <strong>Assistant Error:</strong> {debugInfo.assistantError}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <strong>Configured ID:</strong> {debugInfo.configuredAssistantId}
              </div>

              {debugInfo.assistantDetails && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <div><strong>Name:</strong> {debugInfo.assistantDetails.name || 'Unnamed'}</div>
                  <div><strong>Model:</strong> {debugInfo.assistantDetails.model}</div>
                  <div><strong>Created:</strong> {new Date(debugInfo.assistantDetails.created_at * 1000).toLocaleString()}</div>
                  {debugInfo.assistantDetails.tools && (
                    <div><strong>Tools:</strong> {debugInfo.assistantDetails.tools.map((tool: any) => tool.type).join(', ') || 'None'}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assistant Verification */}
          {debugInfo.assistantVerification && (
            <div className="space-y-2">
              <h4 className="font-medium">Assistant Configuration:</h4>
              {debugInfo.assistantVerification.success ? (
                <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                  <div><strong>Name:</strong> {debugInfo.assistantVerification.assistant.name}</div>
                  <div><strong>Model:</strong> {debugInfo.assistantVerification.assistant.model}</div>
                  <div><strong>Tools:</strong> {debugInfo.assistantVerification.assistant.tools.join(', ') || 'None'}</div>
                  <div className="flex items-center gap-2">
                    <strong>File Search Enabled:</strong>
                    {debugInfo.assistantVerification.assistant.hasFileSearch ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="destructive">No</Badge>
                    )}
                  </div>
                  {debugInfo.assistantVerification.assistant.instructions && (
                    <div><strong>Instructions:</strong> {debugInfo.assistantVerification.assistant.instructions}</div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                  <div className="text-red-700 dark:text-red-300">
                    <strong>Verification Failed:</strong> {debugInfo.assistantVerification.error}
                  </div>
                </div>
              )}
              
              {debugInfo.assistantVerification.recommendations && debugInfo.assistantVerification.recommendations.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                  <div className="text-yellow-700 dark:text-yellow-300">
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {debugInfo.assistantVerification.recommendations.map((rec: string, index: number) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available Assistants */}
          {debugInfo.availableAssistants && debugInfo.availableAssistants.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Available Assistants in your account:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {debugInfo.availableAssistants.map((assistant) => (
                  <div 
                    key={assistant.id} 
                    className={`p-3 rounded-lg border text-sm ${
                      assistant.id === debugInfo.configuredAssistantId 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div><strong>ID:</strong> {assistant.id}</div>
                        <div><strong>Name:</strong> {assistant.name || 'Unnamed'}</div>
                        <div><strong>Model:</strong> {assistant.model}</div>
                        {assistant.tools && assistant.tools.length > 0 && (
                          <div><strong>Tools:</strong> {assistant.tools.join(', ')}</div>
                        )}
                      </div>
                      {assistant.id === debugInfo.configuredAssistantId && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Information */}
          {debugInfo.error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4" />
                <strong>Error:</strong> {debugInfo.error}
              </div>
              {debugInfo.details && (
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {debugInfo.details}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {(!debugInfo.assistantExists || debugInfo.assistantError) && debugInfo.hasApiKey && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <div className="text-blue-700 dark:text-blue-300">
                <strong>Next Steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Go to <a href="https://platform.openai.com/assistants" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Assistants</a></li>
                  <li>Verify your assistant exists and you have access to it</li>
                  <li>If needed, create a new assistant or copy an existing assistant ID from the list above</li>
                  <li>Update your .env.local file with the correct OPENAI_ASSISTANT_ID</li>
                  <li>Restart your development server</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Verification Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="text-lg font-semibold mb-4">File Content Verification</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Enter file ID (e.g., file-abc123...)"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              className="flex-1"
              rows={2}
            />
            <Button 
              onClick={verifyFile} 
              disabled={isVerifyingFile || !fileId.trim()}
              variant="outline"
            >
              {isVerifyingFile ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify File
            </Button>
          </div>
          
          {fileVerification && (
            <div className="space-y-4">
              {fileVerification.error ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                  <div className="text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {fileVerification.error}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div><strong>Filename:</strong> {fileVerification.file.filename}</div>
                    <div><strong>Status:</strong> {fileVerification.file.status}</div>
                    <div><strong>Size:</strong> {fileVerification.file.bytes} bytes</div>
                    <div><strong>Purpose:</strong> {fileVerification.file.purpose}</div>
                    {fileVerification.file.status_details && (
                      <div><strong>Status Details:</strong> {fileVerification.file.status_details}</div>
                    )}
                  </div>
                  
                  {fileVerification.contentPreview && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Direct Content Preview:</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                        {fileVerification.contentPreview}
                      </div>
                    </div>
                  )}
                  
                  {fileVerification.assistantResponse && (
                    <div className="space-y-2">
                      <h4 className="font-medium">What Assistant Can See:</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        {fileVerification.assistantResponse}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <strong>Test Status:</strong>
                    <Badge variant={fileVerification.testCompleted ? "default" : "destructive"}>
                      {fileVerification.runStatus}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}