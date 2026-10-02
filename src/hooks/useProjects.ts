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
    const updatedProjects = projects.map((p) =>
      p.id === projectId ? { ...p, ...updates, lastModified: Date.now() } : p
    );

    // Save to localStorage for persistence in the UI.
    saveProjects(updatedProjects);

    // Sync the file tree to the server as flat paths.
    if (updates.files) {
      const project = updatedProjects.find((p) => p.id === projectId);

      if (project) {
        const filesToWrite: { path: string; content: string }[] = [];

        const flattenFiles = (nodes: typeof project.files, parentPath = "") => {
          for (const node of nodes) {
            const currentPath = parentPath
              ? `${parentPath}/${node.name}`
              : node.name;

            if (node.type === "folder") {
              flattenFiles(node.children || [], currentPath);
            } else {
              filesToWrite.push({
                path: currentPath,
                content: node.content ?? "",
              });
            }
          }
        };

        flattenFiles(project.files);

        console.log(
          "[REAL-APPLY] FLATTENED FILES:",
          JSON.stringify(filesToWrite.map((f) => f.path))
        );

        const response = await fetch("/api/write-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesToWrite, projectId }),
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(
            `Failed to save files (${response.status}): ${details}`
          );
        }

        console.log(`[REAL-APPLY] SERVER SYNC SUCCESS: ${filesToWrite.length} files`);
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
