'use client'

/**
 * Feedback Widget Embed Code Generator
 *
 * Allows workspace admins to:
 * - Customize widget appearance
 * - Preview the widget
 * - Copy embed code to clipboard
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Copy,
  Check,
  Code,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface WidgetSettings {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showRating: boolean
  requireEmail: boolean
}

interface FeedbackWidgetEmbedProps {
  workspaceId: string
  workspaceName: string
  initialSettings?: Partial<WidgetSettings>
  onSettingsChange?: (settings: WidgetSettings) => void
  className?: string
}

const defaultSettings: WidgetSettings = {
  theme: 'auto',
  primaryColor: '#3B82F6',
  position: 'bottom-right',
  showRating: true,
  requireEmail: false,
}

const positionStyles: Record<WidgetSettings['position'], string> = {
  'bottom-right': 'bottom: 20px; right: 20px;',
  'bottom-left': 'bottom: 20px; left: 20px;',
  'top-right': 'top: 20px; right: 20px;',
  'top-left': 'top: 20px; left: 20px;',
}

export function FeedbackWidgetEmbed({
  workspaceId,
  workspaceName,
  initialSettings,
  onSettingsChange,
  className,
}: FeedbackWidgetEmbedProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<WidgetSettings>({
    ...defaultSettings,
    ...initialSettings,
  })
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')

  // Generate base URL
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://your-domain.com'

  // Generate widget URL with params
  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams({
      theme: settings.theme,
      primaryColor: settings.primaryColor,
      requireEmail: settings.requireEmail.toString(),
    })
    return `${baseUrl}/widget/${workspaceId}?${params.toString()}`
  }, [baseUrl, workspaceId, settings])

  // Generate embed code
  const embedCode = useMemo(() => {
    const buttonId = 'feedback-widget-btn-' + workspaceId.slice(0, 8)
    const iframeId = 'feedback-widget-iframe-' + workspaceId.slice(0, 8)

    return `<!-- Feedback Widget for ${workspaceName} -->
<script>
(function() {
  // Create button
  var btn = document.createElement('button');
  btn.id = '${buttonId}';
  btn.innerHTML = '💬 Feedback';
  btn.style.cssText = 'position: fixed; ${positionStyles[settings.position]} z-index: 9999; background: ${settings.primaryColor}; color: white; border: none; border-radius: 24px; padding: 12px 20px; cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s;';
  btn.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
  btn.onmouseout = function() { this.style.transform = 'scale(1)'; };
  document.body.appendChild(btn);

  // Create iframe container
  var container = document.createElement('div');
  container.id = '${iframeId}-container';
  container.style.cssText = 'position: fixed; ${positionStyles[settings.position]} z-index: 9998; width: 360px; height: 480px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: none; overflow: hidden;';

  var iframe = document.createElement('iframe');
  iframe.id = '${iframeId}';
  iframe.src = '${widgetUrl}';
  iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Toggle visibility
  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    container.style.display = isOpen ? 'block' : 'none';
    btn.innerHTML = isOpen ? '✕ Close' : '💬 Feedback';
  };

  // Listen for close message from widget
  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'feedback-widget' && e.data.type === 'close') {
      isOpen = false;
      container.style.display = 'none';
      btn.innerHTML = '💬 Feedback';
    }
    if (e.data && e.data.source === 'feedback-widget' && e.data.type === 'submitted') {
      // Optional: Track submission
      console.log('Feedback submitted:', e.data.id);
    }
  });
})();
</script>`
  }, [workspaceId, workspaceName, widgetUrl, settings])

  // Update settings
  const updateSetting = <K extends keyof WidgetSettings>(
    key: K,
    value: WidgetSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Embed code copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (_err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the code manually',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Embed Feedback Widget
        </CardTitle>
        <CardDescription>
          Add a feedback widget to your website to collect customer feedback
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customization Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => updateSetting('theme', v as WidgetSettings['theme'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (System)</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Position</Label>
            <Select
              value={settings.position}
              onValueChange={(v) => updateSetting('position', v as WidgetSettings['position'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Require Email */}
          <div className="space-y-2">
            <Label>Email Requirement</Label>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={settings.requireEmail}
                onCheckedChange={(v) => updateSetting('requireEmail', v)}
              />
              <span className="text-sm text-muted-foreground">
                {settings.requireEmail ? 'Required' : 'Optional'}
              </span>
            </div>
          </div>
        </div>

        {/* Preview / Code Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'code')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5">
              <Code className="h-4 w-4" />
              Embed Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="relative bg-muted/50 rounded-lg p-4 min-h-[200px]">
              {/* Simulated button preview */}
              <div className="absolute" style={{
                [settings.position.includes('bottom') ? 'bottom' : 'top']: '20px',
                [settings.position.includes('right') ? 'right' : 'left']: '20px',
              }}>
                <button
                  className="flex items-center gap-2 px-5 py-3 text-white rounded-full font-medium text-sm shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  💬 Feedback
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-8">
                Widget button will appear at the {settings.position.replace('-', ' ')} corner
              </p>

              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(widgetUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Widget Preview
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs">
                <code>{embedCode}</code>
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Paste this code before the closing <code>&lt;/body&gt;</code> tag on your website.
            </p>
          </TabsContent>
        </Tabs>

        {/* Direct Links */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Direct Links</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between bg-muted/50 rounded p-2">
              <span className="text-muted-foreground">Feedback Page:</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {baseUrl}/feedback/{workspaceId}
              </code>
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded p-2">
              <span className="text-muted-foreground">Widget Page:</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {widgetUrl}
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
