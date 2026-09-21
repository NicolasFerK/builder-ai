import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  MoreVertical,
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FileNode } from '@/types';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

type NewProjectForm = {
  name: string;
  description: string;
};

interface WorkspaceSidebarProps {
  onProjectCreated?: (id: string) => void;
}

export function WorkspaceSidebar({ onProjectCreated }: WorkspaceSidebarProps) {
  const { projects, createProject, getProject } = useProjects();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm<NewProjectForm>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const activeProject = getProject(projectId || '');

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const onSubmit = (data: NewProjectForm) => {
    const newProject = createProject(data.name, data.description);
    toast.success('Project created!');
    reset();
    if (onProjectCreated) {
      onProjectCreated(newProject.id);
    } else {
      navigate(`/project/${newProject.id}`);
    }
  };

  const renderFileTree = (nodes: FileNode[] | undefined, depth = 0) => {
    if (!nodes) return null;
    return nodes.map((node) => {\n      const isExpanded = expandedFolders.has(node.id);\n      const isFolder = node.type === 'folder';\n\n      return (\n        <div key={node.id}>\n          <div\n            className=\"flex items-center gap-1 py-1 px-2 cursor-pointer text-sm rounded-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted\"\n            style={{ paddingLeft: `${depth * 12 + 8}px` }}\n            onClick={() => isFolder ? toggleFolder(node.id) : null}\n          >\n            {isFolder ? (\n              <>\n                {isExpanded ? <ChevronDown className=\"w-3 h-3\" /> : <ChevronRight className=\"w-3 h-3\" />}\n                <Folder className=\"w-4 h-4 text-blue-500\" />\n              </>\n            ) : (\n              <>\n                <div className=\"w-3\" /> \n                <FileCode className=\"w-4 h-4 text-slate-400\" />\n              </>\n            )}\n            <span className=\"truncate\">{node.name}</span>\n          </div >\n          {isFolder && isExpanded && node.children && (\n            <div>{renderFileTree(node.children, depth + 1)}</div>\n          )}\n        </div >\n      );\n    });\n  };\n\n  return (\n    <aside className=\"w-64 border-r bg-card flex flex-col h-full\">\n      <div className=\"p-4 flex items-center gap-2 border-b\">\n        <div className=\"w-8 h-8 bg-primary rounded-lg flex items-center justify-center\">\n          <div className=\"w-4 h-4 bg-primary-foreground rounded-sm\" />\n        </div>\n        <span className=\"font-bold text-lg tracking-tight\">BuilderAI</span>\n      </div>\n\n      <div className=\"p-4\">\n        <Dialog>\n          <DialogTrigger asChild>\n            <Button variant=\"outline\" className=\"w-full justify-start gap-2\">\n              <Plus className=\"w-4 h-4\" />\n              New Project\n            </Button>\n          </DialogTrigger>\n          <DialogContent className=\"sm:max-w-[425px]\">\n            <DialogHeader>\n              <DialogTitle>Create New Project</DialogTitle>\n            </DialogHeader>\n            <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-4 py-4\">\n              <div className=\"space-y-2\">\n                <Label htmlFor=\"name\">Project Name</Label>\n                <Input id=\"name\" placeholder=\"e.g., My Awesome App\" {...register('name', { required: true })} />\n              </div>\n              <div className=\"space-y-2\">\n                <Label htmlFor=\"description\">Initial Description</Label>\n                <Textarea \n                  id=\"description\" \n                  placeholder=\"Describe what you want to build...\" \n                  className=\"min-h-[100px]\"\n                  {...register('description')} \n                />\n              </div>\n              <Button type=\"submit\" className=\"w-full\">Create Project</Button>\n            </form>\n          </DialogContent>\n        </Dialog>\n      </div>\n\n      <div className=\"flex-1 overflow-y-auto px-2\">\n        {activeProject ? (\n          <>\n            <div className=\"text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider\">\n              Files\n            </div>\n            <ScrollArea className=\"h-64 border-b mb-4\">\n               <div className=\"py-2\">\n                 {renderFileTree(activeProject.files)}\n               </div>\n            </ScrollArea>\n            <div className=\"text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider\">\n              Recent Projects\n            </div\n          </>\n        ) : (\n          <div className=\"text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider\">\n            Recent Projects\n          </div\n        )}\n        \n        <nav className=\"space-y-1\">\n          {projects.map((project) => (\n            <button\n              key={project.id}\n              onClick={() => navigate(`/project/${project.id}`)}\n              className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors group ${\n                projectId === project.id \n                  ? 'bg-primary/10 text-primary font-medium' \n                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'\n              }`}\n            >\n              <div className=\"flex items-center gap-2 truncate\">\n                <Folder className=\"w-4 h-4 flex-shrink-0\" />\n                <span className=\"truncate\">{project.name}</span>\n              </div>\n              <MoreVertical className=\"w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity\" />\n            </button>\n          ))}\n        </nav>\n      </div>\n\n      <div className=\"p-4 border-t space-y-1\">\n        <Button variant=\"ghost\" className=\"w-full justify-start gap-2 text-muted-foreground\" onClick={() => navigate('/')}>\n          <LayoutDashboard className=\"w-4 h-4\" />\n          Dashboard\n        </Button>\n        <Button variant=\"ghost\" className=\"w-full justify-start gap-2 text-muted-foreground\">\n          <Settings className=\"w-4 h-4\" />\n          Settings\n        </Button>\n      </div>\n    </aside>\n  );\n}\n