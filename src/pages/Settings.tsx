import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, RefreshCcw, Save, Moon, Sun } from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { toast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings saved",
      description: "Your AI configuration has been updated.",
    });
  };

  const handleReset = () => {
    resetSettings();
    toast({
      title: "Settings reset",
      description: "Your AI configuration has been cleared.",
    });
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how BuilderAI looks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <Label htmlFor="theme-mode">Dark Mode</Label>
          </div>
          <Switch
            id="theme-mode"
            checked={settings.theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Connection</CardTitle>
          <CardDescription>
            Configure how your projects connect to AI models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API Endpoint URL</Label>
              <Input
                id="apiUrl"
                type="url"
                placeholder="https://api.example.com/v1/chat/completions"
                value={settings.apiUrl}
                onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                The full URL for your AI model's chat completion endpoint.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your authentication token for the API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name (Optional)</Label>
              <Input
                id="modelName"
                type="text"
                placeholder="gpt-4o, claude-3-5-sonnet, etc."
                value={settings.modelName}
                onChange={(e) => updateSettings({ modelName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The specific model identifier to use.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Note: These settings are stored locally in your browser.
      </div>
    </div>
  );
};

export default SettingsPage;
