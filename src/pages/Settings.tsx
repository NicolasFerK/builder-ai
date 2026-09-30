import React, { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, RefreshCcw, Save, Moon, Sun, Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SettingsPage = () => {
  const { settings, updateSettings, updatePublicPreviewUrl, resetSettings } = useSettings();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(settings.publicPreviewUrl || '');
  const [isTesting, setIsTesting] = useState(false);

  const handleAISettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ 
        apiUrl: settings.apiUrl, 
        apiKey: settings.apiKey, 
        modelName: settings.modelName 
      });
      toast({
        title: "Settings saved",
        description: "Your AI configuration has been updated.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Error saving settings",
        description: "Could not update your AI configuration.",
      });
    }
  };

  const handlePreviewUrlSave = async () => {
    try {
      await updatePublicPreviewUrl(previewUrl || undefined);
      toast({
        title: "Preview URL updated",
        description: "The public preview address has been saved.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Error saving URL",
        description: "Could not update the preview URL.",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!previewUrl) return;
    setIsTesting(true);
    try {
      // A simple check to see if the URL is reachable
      // Note: This might fail due to CORS if the proxy doesn't allow it,
      // but we can use it as a basic connectivity test.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch(previewUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);

      toast({
        title: "Connection test",
        description: "The URL appears to be reachable (no-cors check).",
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        variant: 'destructive',
        title: "Connection test failed",
        description: "The URL could not be reached. Please check the address.",
      });
    } finally {
      setIsTesting(false);
    }
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Preview Configuration</CardTitle>
          <CardDescription>
            Set the public URL used to view generated project previews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="previewUrl">Public Preview URL</Label>
              <div className="flex gap-2">
                <Input
                  id="previewUrl"
                  type="url"
                  placeholder="https://your-runpod-proxy.net/"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value.trim())}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !previewUrl}
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  <span className="ml-2">Test</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The address used for the project preview iframe.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                onClick={handlePreviewUrlSave}
                className="flex-1 gap-2"
              >
                <Save className="w-4 h-4" />
                Save URL
              </Button>
            </div>
          </div>
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
          <form onSubmit={handleAISettingsSave} className="space-y-6">
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
        Note: These settings are stored on the server.
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>
            Reload the application to ensure all changes are applied correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <RefreshCcw className="w-4 h-4" />
                Reload Site
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reload the entire application. Any unsaved changes in the current session might be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => window.location.reload()}>
                  Reload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
