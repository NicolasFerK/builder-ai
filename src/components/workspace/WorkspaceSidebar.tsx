import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  ChevronRight,
  MoreVertical,
  Folder,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { Project } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type NewProjectForm = {
  name: string;
  description: string;
};

interface WorkspaceSidebarProps {
  onProjectCreated?: (id: string) => void;
}

export function WorkspaceSidebar({ onProjectCreated }: WorkspaceSidebarProps) {
  const { projects, createProject } = useProjects();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm<NewProjectForm>();

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

  const currentProject = projects.find(p => p.id === projectId);

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 flex items-center gap-2 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-primary-foreground rounded-sm" />
        </div>
        <span className="font-bold text-lg tracking-tight">BuilderAI</span>
      </div>

      <div className="p-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" placeholder="e.g., My Awesome App" {...register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Initial Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe what you want to build..." 
                  className="min-h-[100px]"
                  {...register('description')} 
                />
              </div>
              <Button type="submit" className="w-full">Create Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">
          Recent Projects
        </div>
        <nav className="space-y-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors group ${
                projectId === project.id 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{project.name}</span>
              </div>
              <MoreVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => navigate('/')}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
