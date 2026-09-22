import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Clock, Settings as SettingsIcon, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type DashboardFormValues = {
  name: string;
  description: string;
};

export default function Dashboard() {
  const { projects, createProject, isLoading } = useProjects();
  const navigate = useNavigate();
  const { register, handleSubmit, reset } = useForm<DashboardFormValues>();

  const onSubmit = (data: DashboardFormValues) => {
    try {
      const newProject = createProject(data.name, data.description);
      toast.success('Project created successfully!');
      reset();
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      toast.error('Failed to create project.');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Projects</h1>
            <p className="text-muted-foreground mt-2">Manage and continue your AI-generated applications.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate('/settings')}>
              <SettingsIcon className="w-5 h-5" />
              Settings
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
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
                      className="min-h-[120px]"
                      {...register('description')}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Project</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Starts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-primary transition-all group"
              onClick={() => navigate('/erp')}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>ERP Industrial Demo</CardTitle>
                  <CardDescription>Sistema de controle de estoque e materiais já pronto para testar.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/30">
            <div className="bg-muted p-4 rounded-full mb-4">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              Start by creating your first project and let the AI build it for you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {project.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
