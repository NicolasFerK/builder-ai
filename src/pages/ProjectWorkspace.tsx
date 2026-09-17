import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { PreviewPanel } from '@/components/workspace/PreviewPanel';
import { CodePanel } from '@/components/workspace/CodePanel';
import { useProjects } from '@/hooks/useProjects';
import { FileNode } from '@/types';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { projects } = useProjects();
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const currentProject = projects.find(p => p.id === projectId);

  if (!currentProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <WorkspaceSidebar />
      
      <main className="flex-1 flex overflow-hidden">
        <div className="flex flex-row w-full h-full">
          {/* Chat Panel */}
          <div className="w-1/4 h-full border-r">
            <ChatPanel />
          </div>
          
          <div className="w-3/4 h-full flex flex-col">
            {/* Preview Panel */}
            <div className="h-1/2 border-b">
              <PreviewPanel />
            </div>

            {/* Code Panel */}
            <div className="h-1/2">
              <CodePanel 
                files={currentProject.files} 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
