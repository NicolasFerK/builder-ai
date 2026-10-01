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
import { RefreshCcw, Download, CloudUpload, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { projects } = useProjects();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isUpdatingRemote, setIsUpdatingRemote] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<string | null>(null);

  const currentProject = projects.find(p => p.id === projectId);

  if (!currentProject) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <div className='text-muted-foreground'>Project not found.</div >
      </div >
    );
  }

  const handleUpdateRemotePreview = async () => {
    if (!projectId) return;
    setIsUpdatingRemote(true);
    setRemoteStatus('Iniciando...');
    try {
      const response = await fetch('/api/ssh-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.statusMessage || errorData.message || 'Failed to update remote preview.');
      }

      const { jobId } = await response.json();

      // Polling for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/ssh-preview/status/${jobId}`);
          if (statusResponse.ok) {
            const job = await statusResponse.json();
            setRemoteStatus(job.progress);

            if (job.status === 'completed') {
              clearInterval(pollInterval);
              setIsUpdatingRemote(false);
              setRemoteStatus(null);
              toast({
                title: 'Remote Preview Updated',
                description: 'Project files have been sent and the server is restarting.',
              });
            } else if (job.status === 'failed') {
              clearInterval(pollInterval);
              setIsUpdatingRemote(false);
              setRemoteStatus(null);
              throw new Error(job.error || 'Failed to update remote preview.');
            }
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setIsUpdatingRemote(false);
          setRemoteStatus(null);
          throw err;
        }
      }, 1000);

    } catch (error: any) {
      setIsUpdatingRemote(false);
      setRemoteStatus(null);
      toast({
        variant: 'destructive',
        title: 'Remote Preview Error',
        description: error.message,
      });
    }
  };

  const handleExportProject = async () => {
    try {
      const zip = new JSZip();
      
      const addFilesToZip = (nodes: any[], path: string) => {
        for (const node of nodes) {
          const currentPath = path ? `${path}/${node.name}` : node.name;
          if (node.type === 'file') {
            zip.file(currentPath, node.content || '');
          } else if (node.type === 'folder' && node.children) {
            addFilesToZip(node.children, currentPath);
          }
        }
      };

      addFilesToZip(currentProject.files, '');

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${currentProject.name.replace(/\\s+/g, '_').toLowerCase()}_project.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export project:', error);
    }
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  const isMobileMode = settings.viewMode === 'mobile';

  return (
    <div className='h-screen w-full flex overflow-hidden bg-background'>
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
                  <div className='flex items-center gap-4'>
                    {remoteStatus && (
                      <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {remoteStatus}
                      </div>
                    )}
                    <div className='text-xs text-muted-foreground'>
                      {currentProject.name}
                    </div >
                    <div className='flex items-center gap-2'>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUpdateRemotePreview}
                        disabled={isUpdatingRemote}
                        title="Atualizar Preview Remoto"
                      >
                        {isUpdatingRemote ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleExportProject}
                        title="Exportar projeto"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reload Site?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reload the entire application?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => window.location.reload()}>
                              Reload
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div >
                  </div >
                </div >
                <TabsContent value='preview' className='flex-1 m-0 overflow-hidden'>
                  <PreviewPanel projectId={projectId} files={currentProject.files || []} />
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
