import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, RefreshCcw, Save, Moon, Sun, Globe, Loader2, Server, Key } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SettingsPage = () => {
  const { settings, updateSettings, updatePublicPreviewUrl, resetSettings } = useSettings();
  const { toast } = useToast();
  
  const [aiFormData, setAiFormData] = useState({
    apiUrl: settings.apiUrl,
    apiKey: settings.apiKey || '',
    modelName: settings.modelName || '',
  });

  const [sshFormData, setSshFormData] = useState({
    host: settings.sshConfig?.host || '',
    port: settings.sshConfig?.port || 22,
    user: settings.sshConfig?.user || '',
    privateKey: settings.sshConfig?.privateKey || '',
    password: settings.sshConfig?.password || '',
  });
  
  const [previewUrl, setPreviewUrl] = useState(settings.publicPreviewUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAiFormData({
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey || '',
      modelName: settings.modelName || '',
    });
  }, [settings.apiUrl, settings.apiKey, settings.modelName]);

  useEffect(() => {
    setSshFormData({
      host: settings.sshConfig?.host || '',
      port: settings.sshConfig?.port || 22,
      user: settings.sshConfig?.user || '',
      privateKey: settings.sshConfig?.privateKey || '',
      password: settings.sshConfig?.password || '',
    });
  }, [settings.sshConfig]);

  useEffect(() => {
    setPreviewUrl(settings.publicPreviewUrl || '');
  }, [settings.publicPreviewUrl]);

  const handleAISettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({ 
        apiUrl: aiFormData.apiUrl, 
        apiKey: aiFormData.apiKey, 
        modelName: aiFormData.modelName,
        sshConfig: {
          host: sshFormData.host,
          port: Number(sshFormData.port),
          user: sshFormData.user,
          privateKey: sshFormData.privateKey || undefined,
          password: sshFormData.password || undefined,
        }
      });
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error saving settings",
        description: error.message || "Could not update your configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewUrlSave = async () => {
    try {
      await updatePublicPreviewUrl(previewUrl || undefined);
      toast({
        title: "Preview URL updated",
        description: "The public preview address has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Error saving URL",
        description: error.message || "Could not update the preview URL.",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!previewUrl) return;
    setIsTesting(true);
    try {
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

  const handleReset = async () => {
    await resetSettings();
    toast({
      title: "Settings reset",
      description: "Your configuration has been cleared.",
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

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="api">API & SSH</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
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
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                AI API Connection
              </CardTitle>
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
                    value={aiFormData.apiUrl}
                    onChange={(e) => setAiFormData({ ...aiFormData, apiUrl: e.target.value })}
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
                    value={aiFormData.apiKey}
                    onChange={(e) => setAiFormData({ ...aiFormData, apiKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name (Optional)</Label>
                  <Input
                    id="modelName"
                    type="text"
                    placeholder="gpt-4o, claude-3-5-sonnet, etc."
                    value={aiFormData.modelName}
                    onChange={(e) => setAiFormData({ ...aiFormData, modelName: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1 gap-2" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? "Saving..." : "Save AI Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Remote Preview (SSH)
              </CardTitle>
              <CardDescription>
                Configure SSH access for remote project deployment and preview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAISettingsSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sshHost">SSH Host</Label>
                    <Input
                      id="sshHost"
                      type="text"
                      placeholder="123.456.78.90"
                      value={sshFormData.host}
                      onChange={(e) => setSshFormData({ ...sshFormData, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sshPort">SSH Port</Label>
                    <Input
                      id="sshPort"
                      type="number"
                      placeholder="22"
                      value={sshFormData.port}
                      onChange={(e) => setSshFormData({ ...sshFormData, port: parseInt(e.target.value) || 22 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sshUser">SSH User</Label>
                  <Input
                    id="sshUser"
                    type="text"
                    placeholder="ubuntu"
                    value={sshFormData.user}
                    onChange={(e) => setSshFormData({ ...sshFormData, user: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sshPassword">SSH Password (Optional)</Label>
                    <Input
                      id="sshPassword"
                      type="password"
                      placeholder="your-password"
                      value={sshFormData.password}
                      onChange={(e) => setSshFormData({ ...sshFormData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sshPrivateKey">SSH Private Key (Optional)</Label>
                    <textarea
                      id="sshPrivateKey"
                      rows={5}
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                      value={sshFormData.privateKey}
                      onChange={(e) => setSshFormData({ ...sshFormData, privateKey: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1 gap-2" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? "Saving..." : "Save SSH Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
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
                  <p className="text-xs text-muted-foreground">\n                    The address used for the project preview iframe.\n                  </p>
                </div>
                <div className="flex gap-2">\n                  <Button \n                    type="button" \n                    onClick={handlePreviewUrlSave}\n                    className="flex-1 gap-2"\n                  >\n                    <Save className="w-4 h-4" />\n                    Save URL\n                  </Button>\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n        </TabsContent>\n      </Tabs>\n\n      <div className="mt-8 flex justify-between items-center text-sm text-muted-foreground">\n        <span>Note: These settings are stored on the server.</span>\n        <Button \n          variant="outline" \n          size="sm" \n          onClick={handleReset}\n          className="text-destructive hover:text-destructive hover:bg-destructive/10"\n        >\n          <RefreshCcw className="w-4 h-4 mr-2" />\n          Reset All Settings\n        </Button>\n      </div>\n\n      <Card className="mt-8">\n        <CardHeader>\n          <CardTitle>System</CardTitle>\n          <CardDescription>\n            Reload the application to ensure all changes are applied correctly.\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          <AlertDialog>\n            <AlertDialogTrigger asChild>\n              <Button variant="outline" className="w-full gap-2">\n                <RefreshCcw className="w-4 h-4" />\n                Reload Site\n              </Button>\n            </AlertDialogTrigger>\n            <AlertDialogContent>\n              <AlertDialogHeader>\n                <AlertDialogTitle>Are you sure?</AlertDialogTitle>\n                <AlertDialogDescription>\n                  This will reload the entire application. Any unsaved changes in the current session might be lost.\n                </AlertDialogDescription>\n              </AlertDialogHeader>\n              <AlertDialogFooter>\n                <AlertDialogCancel>Cancel</AlertDialogCancel>\n                <AlertDialogAction onClick={() => window.location.reload()}>\n                  Reload\n                </AlertDialogAction>\n              </AlertDialogFooter>\n            </AlertDialogContent>\n          </AlertDialog>\n        </CardContent>\n      </Card>\n    </div>\n  );\n};\n\nexport default SettingsPage;\n