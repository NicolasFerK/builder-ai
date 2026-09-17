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
      chatHistory: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Hello! I'm your AI builder. Describe what you'd like to create, and I'll start building it for you!`,
          timestamp: Date.now(),
        },
      ],
      files: [
        {
          id: 'root',
          name: 'src',
          type: 'folder',
          children: [
            { id: 'app-tsx', name: 'App.tsx', type: 'file', content: 'import React from "react";\n\nexport default function App() {\n  return <div>Hello World</div>;\n}' },
            { id: 'main-tsx', name: 'main.tsx', type: 'file', content: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);' },
          ],
        },
        { id: 'package-json', name: 'package.json', type: 'file', content: '{\n  "name": "new-project",\n  "version": "1.0.0",\n  "dependencies": {}\n}' },
      ],
    };

    const updatedProjects = [newProject, ...projects];
    saveProjects(updatedProjects);
    return newProject;
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map((p) =>
      p.id === projectId ? { ...p, ...updates, lastModified: Date.now() } : p
    );
    saveProjects(updatedProjects);
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    saveProjects(updatedProjects);
  };

  const getProject = (projectId: string) => {
    return projects.find((p) => p.id === projectId);
  };

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    getProject,
  };
}
