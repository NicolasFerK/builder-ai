import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { PreviewPanel } from '@/components/workspace/PreviewPanel';
import { CodePanel } from '@/components/workspace/CodePanel';
import { useProjects } from '@/hooks/useProjects';
import { FileNode } from '@/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

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
    <div className="h-screen w-full flex overflow-hidden">
      <WorkspaceSidebar />
      
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <ChatPanel />
          </ResizablePanel>
          
          <ResizableHandle withHandle />

          {/* Main Content Area: Preview & Code */}
          <ResizablePanel defaultSize={75}>
            <ResizablePanelGroup direction="vertical">
              
              {/* Preview Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <PreviewPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Code Panel */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <CodePanel 
                  files={currentProject.files} 
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
