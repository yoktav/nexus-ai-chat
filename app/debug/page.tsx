'use client';

import DebugPanel from '@/components/DebugPanel';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">OpenAI Configuration Debug</h1>
          <p className="text-muted-foreground">
            Use this page to diagnose and fix OpenAI configuration issues.
          </p>
        </div>
        
        <DebugPanel />
      </div>
    </div>
  );
}