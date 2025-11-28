'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KEYBOARD_SHORTCUTS } from '../hooks/use-work-board-shortcuts'

interface KeyboardHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardHelpDialog({ open, onOpenChange }: KeyboardHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick actions to navigate and work faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{shortcut.description}</span>
                <span className="text-xs text-muted-foreground">{shortcut.scope}</span>
              </div>
              <KeyboardKey>{shortcut.key}</KeyboardKey>
            </div>
          ))}
        </div>
        <div className="pt-4 text-xs text-muted-foreground text-center">
          Press <KeyboardKey size="sm">Esc</KeyboardKey> to close
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Simple keyboard key display component
interface KeyboardKeyProps {
  children: React.ReactNode
  size?: 'sm' | 'md'
}

function KeyboardKey({ children, size = 'md' }: KeyboardKeyProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
  return (
    <kbd
      className={`inline-flex items-center justify-center ${sizeClasses} font-mono font-medium bg-muted border border-border rounded shadow-sm`}
    >
      {children}
    </kbd>
  )
}
