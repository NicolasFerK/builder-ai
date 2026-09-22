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
          id: 'index-html',
          name: 'index.html',
          type: 'file',
          content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>New Project</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>'
        },
        {
          id: 'vite-config',
          name: 'vite.config.ts',
          type: 'file',
          content: 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});'
        },
        {
          id: 'root',
          name: 'src',
          type: 'folder',
          children: [
            { id: 'app-tsx', name: 'App.tsx', type: 'file', content: 'import React from "react";\n\nexport default function App() {\n  return <div className="flex items-center justify-center h-screen">Hello World</div>;\n}' },
            { id: 'main-tsx', name: 'main.tsx', type: 'file', content: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);' },
          ],
        },
        { id: 'package-json', name: 'package.json', type: 'file', content: '{\n  "name": "new-project",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@types/react": "^18.2.0",\n    "@types/react-dom": "^18.2.0",\n    "@vitejs/plugin-react": "^4.0.0",\n    "vite": "^4.0.0"\n  }\n}' },
      ],
      aiContext: '# Project Context\n\n## Project\n\nName: ',
      sessionSummaries: [],
      currentSessionSummary: undefined,
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
