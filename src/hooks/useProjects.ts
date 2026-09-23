import { useState, useEffect } from 'react';
import { Project } from '../types';

const STORAGE_KEY = 'ai_app_builder_projects';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse projects from localStorage', e);
        setProjects([]);
      }
    }
    setIsLoading(false);
  }, []);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  };

  const createProject = (name: string, description: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: Date.now(),
      lastModified: Date.now(),
      chatHistory: [{ id: crypto.randomUUID(), role: 'assistant', content: 'Hello!', timestamp: Date.now() }],
      files: [],
      projectMemory: '# Project Context\\n\\n## Project\\n\\nName: ',
      sessionSummaries: [],
      currentSessionSummary: undefined,
    };
    const updatedProjects = [newProject, ...projects];
    saveProjects(updatedProjects);
    return newProject;
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    console.log(`[REAL-APPLY] UPDATE PROJECT FILES: ${JSON.stringify(updates.files?.map(f => f.path))}`);
    const updatedProjects = projects.map((p) =>
      p.id === projectId ? { ...p, ...updates, lastModified: Date.now() } : p
    );
    
    // Save to localStorage for persistence in the UI
    saveProjects(updatedProjects);

    // If we are updating files, also sync them to the filesystem
    if (updates.files) {
      try {
        const project = updatedProjects.find(p => p.id === projectId);
        if (project && project.files) {
          console.log(`[REAL-APPLY] WRITE FILES PAYLOAD: ${JSON.stringify({ files: project.files, projectId: projectId })}`);
          await fetch('/api/write-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: project.files, projectId: projectId }),
          });
        }
      } catch (error) {
        console.error('Failed to sync files to filesystem:', error);
      }
    }
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    saveProjects(updatedProjects);
  };

  const getProject = (projectId: string) => {
    return projects.find((p) => p.id === projectId);
  };

  return { projects, isLoading, createProject, updateProject, deleteProject, getProject };
}
