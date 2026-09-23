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
    } else {
      const seededProject: Project = {
        id: 'seeded-login-app',
        name: 'Meu App de Login',
        description: 'O projeto que você criou no BuilderAI',
        createdAt: Date.now(),
        lastModified: Date.now(),
        chatHistory: [{ id: 'init', role: 'assistant', content: 'Seu projeto de Login e Dashboard foi carregado com sucesso!', timestamp: Date.now() }],
        files: [
          { id: 'index-html', name: 'index.html', type: 'file', content: '<!DOCTYPE html>\\n<html lang="en">\\n<head>\\n  <meta charset="UTF-8" />\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\\n  <title>Login App</title>\\n</head>\\n<body id="root"></body>\\n<script type="module" src="/src/main.tsx"></script>\\n</html>' },
          { id: 'vite-config', name: 'vite.config.ts', type: 'file', content: 'import { defineConfig } from "vite";\\nimport react from "@vitejs/plugin-react";\\n\\nexport default defineConfig({ plugins: [react()] });' },
          { id: 'package-json', name: 'package.json', type: 'file', content: '{\\n  "name": "login-app",\\n  "version": "1.0.0",\\n  "dependencies": {\\n    "react": "^18.2.0",\\n    "react-dom": "^18.2.0",\\n    "lucide-react": "latest",\\n    "react-router-dom": "latest"\\n  },\\n  "devDependencies": {\\n    "@vitejs/plugin-react": "^4.0.0",\\n    "vite": "^4.0.0"\\n  }\\n}' },
          { id: 'main-tsx', name: 'src/main.tsx', type: 'file', content: 'import React from "react";\\nimport ReactDOM from "react-dom/client";\\nimport App from "./App";\\nimport "./globals.css";\\n\\nReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);' },
          { 
            id: 'app-tsx', 
            name: 'src/App.tsx', 
            type: 'file', 
            content: `import React, { useState } from "react";
import { LogIn, User, Lock, LogOut, LayoutDashboard, CheckCircle2, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AuthState = "logged_out" | "logging_in" | "logged_in";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("logged_out");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthState("logging_in");
    setTimeout(() => {
      if (email === "admin@teste.com" && password === "123456") {
        setAuthState("logged_in");
      } else {
        setError("E-mail ou senha incorretos. (Use admin@teste.com / 123456)");
        setAuthState("logged_out");
      }
    }, 1000);
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setAuthState("logged_out");
  };

  if (authState === "logged_out" || authState === "logging_in") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-2">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div >
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription>Faça login para acessar sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="admin@teste.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div >
              </div >
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div >
              </div >
              {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center font-medium">{error}</div>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={authState === "logging_in"}>{authState === "logging_in" ? "Carregando..." : "Entrar"}</Button>
            </form>
            <div className="mt-6 text-center text-xs text-muted-foreground">Dica: admin@teste.com / 123456</div>
          </CardContent>
        </Card>
      </div >
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg"><LayoutDashboard className="w-5 h-5 text-white" /></div >
          <span className="font-bold text-xl tracking-tight text-slate-900">MeuSistema</span >
        </div >
        <Button variant="ghost" onClick={handleLogout} className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors gap-2"><LogOut className="w-4 h-4" /> Sair</Button>
      </header>
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="bg-green-500 h-2 w-full" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 className="w-8 h-8 text-green-600" /></div >
                <div><CardTitle className="text-2xl">Login realizado com sucesso!</CardTitle><p className="text-muted-foreground">Bem-vindo ao seu painel de controle.</p></div >
              </div >
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4">
                {[
                  { label: "Usuário", value: email, icon: User },
                  { label: "Status", value: "Ativo", icon: CheckCircle2 },
                  { label: "Nível de Acesso", value: "Administrador", icon: LayoutDashboard },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg"><item.icon className="w-5 h-5 text-slate-600" /></div >
                      <span className="font-medium text-slate-700">{item.label}</span >
                    </div >
                    <span className="text-slate-900 font-semibold">{item.value}</span >
                  </div >
                ))}
              </div >
            </CardContent>
          </Card>
        </div >
      </main>
    </div>
  );
}` },
          }
        ],
        projectMemory: '# Project Context\\n\\n## Project\\n\\nName: ',
        sessionSummaries: [],
        currentSessionSummary: undefined,
      };
      setProjects([seededProject]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([seededProject]));
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

  return { projects, isLoading, createProject, updateProject, deleteProject, getProject };
}
