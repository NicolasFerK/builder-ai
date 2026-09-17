import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PreviewPanel() {
  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-2 border-b flex items-center justify-between bg-background">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground px-2">Preview</span>
        </div >
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Monitor className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Smartphone className="w-4 h-4" />
          </Button>
        </div >
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Monitor className="w-8 h-8 text-muted-foreground" />
          </div >
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No Preview Available</h3>
            <p className="text-sm text-muted-foreground">
              The application preview will appear here once the AI starts generating your code.
            </p>
          </div >
        </div >
      </div >
    </div >
  );
}
