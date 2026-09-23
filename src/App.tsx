import React, { useState } from "react";
import { LogIn, User, Lock, LogOut, LayoutDashboard, CheckCircle2, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Tipagem para o estado de autenticação
type AuthState = "logged_out" | "logging_in" | "logged_in";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("logged_out");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Simulação de login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthState("logging_in");

    // Simulando uma chamada de API
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

  // View: Tela de Login
  if (authState === "logged_out" || authState === "logging_in") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-2">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div >
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Faça login para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@teste.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div >
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div >
              </div>

              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center font-medium">
                  {error}
                </div >
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={authState === "logging_in"}
              >
                {authState === "logging_in" ? "Carregando..." : "Entrar"}
              </Button>
            </form>
            <div className="mt-6 text-center text-xs text-muted-foreground">
              Dica: admin@teste.com / 123456
            </div >
          </CardContent>
        </Card>
      </div >
    );
  }

  // View: Dashboard (Pós-login)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div >
          <span className="font-bold text-xl tracking-tight text-slate-900">MeuSistema</span >
        </div >
        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="bg-green-500 h-2 w-full" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div >
                <div>
                  <CardTitle className="text-2xl">Login realizado com sucesso!</CardTitle>
                  <p className="text-muted-foreground">Bem-vindo ao seu painel de controle.</p>
                </div >
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
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <item.icon className="w-5 h-5 text-slate-600" />
                      </div >
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-slate-900 font-semibold">{item.value}</span>
                  </div >
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
