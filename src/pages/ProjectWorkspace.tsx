import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { PreviewPanel } from '@/components/workspace/PreviewPanel';
import { CodePanel } from '@/components/workspace/CodePanel';
import { useProjects } from '@/hooks/useProjects';
import { FileNode } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useSettings } from '@/context/SettingsContext';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { projects } = useProjects();
  const { settings } = useSettings();
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const currentProject = projects.find(p => p.id === projectId);

  if (!currentProject) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <div className='text-muted-foreground'>Project not found.</div >
      </div >
    );
  }

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  const isMobileMode = settings.viewMode === 'mobile';

  return (
    <div className={`h-screen w-full flex overflow-hidden bg-background ${isMobileMode ? 'max-w-[430px] mx-auto border-x shadow-2xl' : ''}`}>
      <WorkspaceSidebar />
      <div className='flex-1 flex overflow-hidden'>
        <ResizablePanelGroup direction='horizontal' className='flex-1'>
          <ResizablePanel defaultSize={25} minSize={15} className='flex flex-col border-r'>
            <ChatPanel />
          </ResizablePanel>
          
          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={75}>
            <div className='flex flex-col w-full h-full overflow-hidden'>
              <Tabs defaultValue='preview' className='flex flex-col w-full h-full'>
                <div className='flex items-center justify-between px-4 border-b h-12 bg-muted/30 shrink-0'>
                  <TabsList className='bg-transparent h-full w-auto p-0 gap-2'>
                    <TabsTrigger 
                      value='preview' 
                      className='data-[state=active]:bg-background data-[state=active]:shadow-sm'
                    >
                      Preview
                    </TabsTrigger>
                    <TabsTrigger 
                      value='code' 
                      className='data-[state=active]:bg-background data-[state=active]:shadow-sm'
                    >
                      Code
                    </TabsTrigger>
                  </TabsList>
                  <div className='text-xs text-muted-foreground'>
                    {currentProject.name}
                  </div >
                </div >
                <TabsContent value='preview' className='flex-1 m-0 overflow-hidden'>
                  <PreviewPanel project={currentProject} />
                </TabsContent>
                <TabsContent value='code' className='flex-1 m-0 overflow-hidden'>
                  <CodePanel 
                    files={currentProject.files || []} 
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                  />
                </TabsContent>
              </Tabs>
            </div >
          </ResizablePanel>
        </ResizablePanelGroup>
      </div >
    </div >
  );
}
