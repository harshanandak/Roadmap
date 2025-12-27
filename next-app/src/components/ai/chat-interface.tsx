'use client'

/**
 * ChatInterface Component
 *
 * Chat-first AI interface with tool shortcuts:
 * - Free-form conversation with AI
 * - [Create] [Analyze] [Optimize] [Strategy] hoverable buttons above input
 * - Tool shortcuts insert prompt templates into the input
 * - AI parses natural language and returns confirmation requests
 * - ToolConfirmationCard displayed inline for user approval
 *
 * Uses the unified-chat API which combines research and agentic tools.
 */

import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Send,
  Bot,
  User,
  Loader2,
  Settings2,
  Search,
  Globe,
  BookOpen,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Target,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolShortcutBar } from './tool-shortcut-bar'
import { ToolConfirmationCard } from './tool-confirmation-card'
import type { ToolCategory } from '@/lib/ai/schemas/agentic-schemas'
import { getModelOptionsForUI } from '@/lib/ai/models-config'

// =============================================================================
// TYPES
// =============================================================================

interface WorkItem {
  id: string
  name: string
  type: string
  status: string
}

interface WorkspaceContext {
  workspaceId: string
  workspaceName?: string
  workspacePhase?: string
  teamId: string
  currentWorkItems?: WorkItem[]
}

export interface ChatInterfaceProps {
  workspaceContext: WorkspaceContext
  onMinimize?: () => void
  compact?: boolean
  className?: string
}

interface ConfirmationRequest {
  type: 'confirmation_request'
  toolName: string
  displayName: string
  category: ToolCategory
  extractedParams: Record<string, unknown>
  description: string
  warnings?: string[]
}

// =============================================================================
// MODELS
// =============================================================================

/**
 * Get model options from the central registry
 * Includes "Auto" option at the top for intelligent routing
 */
const AI_MODELS = getModelOptionsForUI()

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatInterface({
  workspaceContext,
  onMinimize,
  compact = false,
  className,
}: ChatInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState('auto')
  const [quickMode, setQuickMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Store dynamic values in refs to avoid transport recreation
  const dynamicBodyRef = useRef({ selectedModel, quickMode, workspaceContext })
  dynamicBodyRef.current = { selectedModel, quickMode, workspaceContext }

  // Memoize transport to prevent unnecessary re-creation
  // Use a function for body to get latest dynamic values on each request
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/unified-chat',
        body: () => ({
          model: dynamicBodyRef.current.selectedModel,
          quickMode: dynamicBodyRef.current.quickMode,
          workspaceContext: dynamicBodyRef.current.workspaceContext,
        }),
      }),
    [] // Empty deps - transport instance is stable, body function reads from ref
  )

  // Use unified-chat API with agentic tools
  // AI SDK v5 requires DefaultChatTransport for custom API endpoints
  const chatHelpers = useChat({
    transport: chatTransport,
    onError: (err: Error) => {
      console.error('[ChatInterface] Error:', err)
    },
  })

  // Extract chat helpers with type assertions for AI SDK v5 compatibility
  // AI SDK v5 uses: sendMessage({ text }), regenerate(), stop(), status, messages
  const messages = chatHelpers.messages as UIMessage[]
  const status = chatHelpers.status
  const error = chatHelpers.error
  const setMessages = chatHelpers.setMessages
  const stop = chatHelpers.stop
  const regenerate = (chatHelpers as { regenerate?: () => Promise<void> }).regenerate
  const sendMessage = (chatHelpers as { sendMessage?: (message: { text: string }) => Promise<void> }).sendMessage

  // AI SDK v5: status can be 'ready' | 'streaming' | 'submitted' | 'error'
  // Using string comparison to handle all possible states
  const isLoading = ['streaming', 'submitted', 'in_progress'].includes(status as string)

  // Helper to append assistant messages programmatically (AI SDK v5 uses setMessages)
  const appendAssistantMessage = useCallback(
    (content: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content,
          parts: [{ type: 'text' as const, text: content }],
        } as UIMessage,
      ])
    },
    [setMessages]
  )

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for confirmation requests in tool results
  useEffect(() => {
    if (!messages.length) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    // Check for tool invocations with confirmation requests
    const legacyMessage = lastMessage as unknown as {
      toolInvocations?: Array<{
        toolName: string
        state: string
        result?: unknown
      }>
    }

    if (legacyMessage.toolInvocations) {
      for (const invocation of legacyMessage.toolInvocations) {
        if (invocation.state === 'result' && invocation.result) {
          const result = invocation.result as Record<string, unknown>
          if (result.type === 'confirmation_request') {
            setPendingConfirmation(result as unknown as ConfirmationRequest)
            break
          }
        }
      }
    }
  }, [messages])

  // Handle tool shortcut insertion
  const handleInsertPrompt = useCallback((prompt: string) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }, [])

  // Handle form submission
  // AI SDK v5 uses sendMessage({ text }) to send user messages
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (inputValue.trim() && !isLoading && sendMessage) {
        sendMessage({ text: inputValue.trim() })
        setInputValue('')
        setPendingConfirmation(null)
      }
    },
    [inputValue, isLoading, sendMessage]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSubmit(e as unknown as React.FormEvent)
      }
    },
    [onSubmit]
  )

  // Handle confirmation
  const handleConfirm = useCallback(
    async (params: Record<string, unknown>) => {
      if (!pendingConfirmation) return

      setIsConfirming(true)
      try {
        // Call the agent/execute endpoint
        const response = await fetch('/api/ai/agent/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: pendingConfirmation.toolName,
            params: {
              ...params,
              workspaceId: workspaceContext.workspaceId,
              teamId: workspaceContext.teamId,
            },
            workspaceId: workspaceContext.workspaceId,
            teamId: workspaceContext.teamId,
          }),
        })

        const result = await response.json()

        // Add confirmation result to chat
        if (result.success) {
          appendAssistantMessage(`✅ Successfully created ${pendingConfirmation.displayName.toLowerCase()}. The action ${result.status === 'pending' ? 'is pending approval' : 'has been completed'}.`)
        } else {
          appendAssistantMessage(`❌ Failed to create: ${result.error || 'Unknown error'}`)
        }

        setPendingConfirmation(null)
      } catch (err) {
        console.error('[ChatInterface] Confirm error:', err)
        appendAssistantMessage(`❌ Error executing action: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setIsConfirming(false)
      }
    },
    [pendingConfirmation, workspaceContext, appendAssistantMessage]
  )

  // Handle cancel confirmation
  const handleCancelConfirmation = useCallback(() => {
    setPendingConfirmation(null)
    appendAssistantMessage('Action cancelled. Feel free to ask me something else!')
  }, [appendAssistantMessage])

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([])
    setPendingConfirmation(null)
  }, [setMessages])

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-lg shadow-lg',
        compact ? 'h-[500px]' : 'h-full min-h-[600px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Assistant</span>
          {isLoading && (
            <Badge variant="secondary" className="animate-pulse">
              Thinking...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onMinimize && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b bg-muted/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.icon}</span>
                        <div>
                          <span className="font-medium">{model.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {model.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm pt-4">
              <input
                type="checkbox"
                checked={quickMode}
                onChange={(e) => setQuickMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-muted-foreground">Quick Mode</span>
            </label>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {/* Pending Confirmation Card */}
          {pendingConfirmation && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <ToolConfirmationCard
                data={{
                  toolName: pendingConfirmation.toolName,
                  displayName: pendingConfirmation.displayName,
                  category: pendingConfirmation.category,
                  params: pendingConfirmation.extractedParams,
                  description: pendingConfirmation.description,
                  warnings: pendingConfirmation.warnings,
                }}
                onConfirm={handleConfirm}
                onEdit={handleConfirm}
                onCancel={handleCancelConfirmation}
                isLoading={isConfirming}
              />
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">Error: {error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => regenerate?.()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area with Tool Shortcuts */}
      <div className="p-4 border-t bg-muted/30 space-y-3">
        {/* Tool Shortcut Bar */}
        <ToolShortcutBar
          onInsertPrompt={handleInsertPrompt}
          disabled={isLoading}
        />

        {/* Input Form */}
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chat freely or use tool shortcuts above... (Shift+Enter for new line)"
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          {isLoading ? (
            <Button type="button" variant="outline" onClick={stop}>
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>
            Agentic tools: Create, Analyze, Optimize, Strategy • Research tools enabled
          </span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * CodeBlock Component
 *
 * Renders code blocks with syntax highlighting and copy-to-clipboard functionality.
 * Uses react-syntax-highlighter with the oneDark theme for a modern look.
 */
function CodeBlock({
  language,
  children,
}: {
  language: string | undefined
  children: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  // Detect language from className or default to 'text'
  const lang = language || 'text'

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden">
      {/* Language label and copy button */}
      <div className="flex items-center justify-between bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-700 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          borderRadius: 0,
        }}
        showLineNumbers={children.split('\n').length > 3}
        wrapLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

function WelcomeMessage() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Chat-First AI Assistant</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Chat freely or use the tool shortcuts above to quickly create work items,
          analyze feedback, optimize priorities, and more.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <SuggestionChip icon={<Plus className="h-3 w-3" />}>
          Create a feature
        </SuggestionChip>
        <SuggestionChip icon={<Search className="h-3 w-3" />}>
          Analyze feedback
        </SuggestionChip>
        <SuggestionChip icon={<Target className="h-3 w-3" />}>
          Suggest OKRs
        </SuggestionChip>
      </div>
    </div>
  )
}

function SuggestionChip({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border bg-muted/50 hover:bg-muted transition-colors">
      {icon}
      {children}
    </button>
  )
}

interface LegacyMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  toolInvocations?: Array<{
    toolName: string
    state: 'partial-call' | 'result' | 'call'
    result?: unknown
    args?: unknown
  }>
}

/**
 * MessageBubble Component (Memoized)
 *
 * Wrapped with React.memo to prevent unnecessary re-renders during streaming.
 * Each message only re-renders when its own content changes.
 */
const MessageBubble = memo(function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const legacyMessage = message as unknown as LegacyMessage

  // AI SDK v5: Extract text content from parts array
  // UIMessage uses parts: [{ type: 'text', text: '...' }] instead of content
  const textContent = useMemo(() => {
    // First check parts array (AI SDK v5 format)
    if (message.parts && Array.isArray(message.parts)) {
      const textParts = message.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('')
      if (textParts) return textParts
    }
    // Fallback to legacy content property
    return legacyMessage.content || ''
  }, [message.parts, legacyMessage.content])

  // Filter out confirmation_request results from display (shown as ToolConfirmationCard)
  const displayToolCalls = legacyMessage.toolInvocations?.filter((invocation) => {
    if (invocation.state === 'result' && invocation.result) {
      const result = invocation.result as Record<string, unknown>
      return result.type !== 'confirmation_request'
    }
    return true
  })

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('flex-1 space-y-2 overflow-hidden', isUser && 'text-right')}>
        {textContent && (
          <div
            className={cn(
              'inline-block rounded-lg px-4 py-2 max-w-[85%]',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}
          >
            {isUser ? (
              // User messages: plain text
              <div className="text-sm whitespace-pre-wrap break-words">
                {textContent}
              </div>
            ) : (
              // AI messages: render markdown with GFM support and syntax highlighting
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    // Inline code (not in a code block)
                    code: ({ className, children, ..._props }) => {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !className

                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-xs font-mono">
                            {children}
                          </code>
                        )
                      }

                      // Code block with syntax highlighting
                      return (
                        <CodeBlock language={match?.[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      )
                    },
                    // Pre wrapper - just pass through since code handles rendering
                    pre: ({ children }) => <>{children}</>,
                    // GFM Tables with beautiful styling
                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto rounded-lg border border-zinc-700">
                        <table className="w-full text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-zinc-800 text-zinc-200">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-semibold border-b border-zinc-700">
                        {children}
                      </th>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-zinc-800">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-zinc-800/50 transition-colors">
                        {children}
                      </tr>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2">
                        {children}
                      </td>
                    ),
                    // Links
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        className="text-blue-400 underline hover:text-blue-300 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    // Blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="my-2 pl-3 border-l-2 border-zinc-600 text-zinc-400 italic">
                        {children}
                      </blockquote>
                    ),
                    // Horizontal rules
                    hr: () => <hr className="my-4 border-zinc-700" />,
                    // Headings
                    h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold my-1.5">{children}</h3>,
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {displayToolCalls && displayToolCalls.length > 0 && (
          <div className="space-y-2">
            {displayToolCalls.map((tool, index) => (
              <ToolInvocationDisplay key={index} toolInvocation={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

function ToolInvocationDisplay({
  toolInvocation,
}: {
  toolInvocation: NonNullable<LegacyMessage['toolInvocations']>[0]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toolIcons: Record<string, React.ReactNode> = {
    webSearch: <Search className="h-3 w-3" />,
    extractContent: <Globe className="h-3 w-3" />,
    deepResearch: <BookOpen className="h-3 w-3" />,
    quickAnswer: <Sparkles className="h-3 w-3" />,
    createWorkItem: <Plus className="h-3 w-3" />,
    analyzeFeedback: <Search className="h-3 w-3" />,
    suggestOKRs: <Target className="h-3 w-3" />,
  }

  const toolNames: Record<string, string> = {
    webSearch: 'Web Search',
    extractContent: 'Content Extraction',
    deepResearch: 'Deep Research',
    researchStatus: 'Research Status',
    quickAnswer: 'Quick Answer',
    createWorkItem: 'Create Work Item',
    createTask: 'Create Task',
    createDependency: 'Create Dependency',
    analyzeFeedback: 'Analyze Feedback',
    suggestDependencies: 'Suggest Dependencies',
  }

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {toolIcons[toolInvocation.toolName] || <Sparkles className="h-3 w-3" />}
          <span className="text-xs font-medium">
            {toolNames[toolInvocation.toolName] || toolInvocation.toolName}
          </span>
          {toolInvocation.state === 'partial-call' && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {toolInvocation.state === 'result' && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              Done
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {isExpanded && toolInvocation.state === 'result' && (
        <div className="px-3 py-2 border-t bg-background/50">
          <pre className="text-xs text-muted-foreground overflow-x-auto max-h-[200px]">
            {JSON.stringify(toolInvocation.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ChatInterface
