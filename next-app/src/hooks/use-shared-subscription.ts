'use client'

/**
 * Shared Subscription Hook
 *
 * Provides automatic deduplication of Supabase Realtime subscriptions.
 * Multiple components subscribing to the same channel share a single connection.
 *
 * Benefits:
 * - Prevents duplicate WebSocket connections
 * - Automatic cleanup when last subscriber unmounts
 * - Reference counting ensures proper lifecycle management
 * - Works with any table/filter combination
 *
 * Usage:
 * ```tsx
 * // In multiple components - they'll share ONE subscription
 * const { isSubscribed } = useSharedSubscription({
 *   channelName: 'work-items-workspace-123',
 *   table: 'work_items',
 *   filter: 'workspace_id=eq.123',
 *   onMessage: (payload) => {
 *     console.log('Change detected:', payload)
 *     refetchData()
 *   }
 * })
 * ```
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface SharedSubscriptionConfig {
  /** Unique channel name - subscriptions with same name share connection */
  channelName: string
  /** Table to subscribe to */
  table: string
  /** Filter string (e.g., 'workspace_id=eq.123') */
  filter?: string
  /** Schema (default: 'public') */
  schema?: string
  /** Events to listen for (default: '*' for all) */
  event?: PostgresChangeEvent
  /** Callback when changes are received */
  onMessage?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

interface SharedSubscriptionReturn {
  /** Whether subscription is currently active */
  isSubscribed: boolean
  /** Current subscriber count for this channel */
  subscriberCount: number
  /** Manually unsubscribe (happens automatically on unmount) */
  unsubscribe: () => void
}

// ============================================================================
// Global Subscription Registry
// ============================================================================

interface SubscriptionEntry {
  channel: RealtimeChannel
  refCount: number
  callbacks: Set<(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void>
  status: 'initializing' | 'subscribed' | 'error' | 'closed'
}

// Global registry - tracks all active subscriptions
const subscriptionRegistry = new Map<string, SubscriptionEntry>()

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSharedSubscription({
  channelName,
  table,
  filter,
  schema = 'public',
  event = '*',
  onMessage,
}: SharedSubscriptionConfig): SharedSubscriptionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const callbackRef = useRef(onMessage)
  const supabase = createClient()

  // Keep callback ref up to date using useEffect to avoid ref access during render
  useEffect(() => {
    callbackRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let isActive = true
    let entry = subscriptionRegistry.get(channelName)

    // Wrapper callback to use ref (avoids stale closure)
    const wrappedCallback = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (callbackRef.current) {
        callbackRef.current(payload)
      }
    }

    if (entry) {
      // Existing subscription - increment ref count and add callback
      entry.refCount++
      if (onMessage) {
        entry.callbacks.add(wrappedCallback)
      }
      setSubscriberCount(entry.refCount)
      setIsSubscribed(entry.status === 'subscribed')

      console.log(
        `[useSharedSubscription] Joined existing channel "${channelName}" ` +
        `(${entry.refCount} subscribers)`
      )
    } else {
      // New subscription - create channel
      console.log(`[useSharedSubscription] Creating new channel "${channelName}"`)

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: schema,
            table: table,
            filter: filter,
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            // Only process if event matches (or we're listening to all)
            if (event !== '*' && payload.eventType !== event) {
              return
            }
            // Dispatch to all registered callbacks
            const currentEntry = subscriptionRegistry.get(channelName)
            if (currentEntry) {
              currentEntry.callbacks.forEach((cb) => {
                try {
                  cb(payload)
                } catch (err) {
                  console.error(
                    `[useSharedSubscription] Error in callback for "${channelName}":`,
                    err
                  )
                }
              })
            }
          }
        )
        .subscribe((status) => {
          const currentEntry = subscriptionRegistry.get(channelName)
          if (currentEntry) {
            currentEntry.status = status === 'SUBSCRIBED' ? 'subscribed' : 'initializing'
            if (isActive && status === 'SUBSCRIBED') {
              setIsSubscribed(true)
            }
          }
          console.log(`[useSharedSubscription] Channel "${channelName}" status: ${status}`)
        })

      // Create registry entry
      entry = {
        channel,
        refCount: 1,
        callbacks: new Set(onMessage ? [wrappedCallback] : []),
        status: 'initializing',
      }
      subscriptionRegistry.set(channelName, entry)
      setSubscriberCount(1)
    }

    // Cleanup function
    return () => {
      isActive = false
      const currentEntry = subscriptionRegistry.get(channelName)

      if (currentEntry) {
        // Remove this component's callback
        currentEntry.callbacks.delete(wrappedCallback)
        currentEntry.refCount--

        console.log(
          `[useSharedSubscription] Left channel "${channelName}" ` +
          `(${currentEntry.refCount} remaining)`
        )

        // If last subscriber, cleanup channel
        if (currentEntry.refCount <= 0) {
          console.log(`[useSharedSubscription] Closing channel "${channelName}" (no subscribers)`)
          supabase.removeChannel(currentEntry.channel)
          subscriptionRegistry.delete(channelName)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onMessage is intentionally tracked via callbackRef to avoid re-creating subscriptions
  }, [channelName, table, filter, schema, event, supabase])

  const unsubscribe = () => {
    const entry = subscriptionRegistry.get(channelName)
    if (entry) {
      entry.refCount = 0
      supabase.removeChannel(entry.channel)
      subscriptionRegistry.delete(channelName)
      setIsSubscribed(false)
      setSubscriberCount(0)
    }
  }

  return {
    isSubscribed,
    subscriberCount,
    unsubscribe,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all active subscription channel names
 * Useful for debugging
 */
export function getActiveSubscriptions(): string[] {
  return Array.from(subscriptionRegistry.keys())
}

/**
 * Get total subscriber count across all channels
 */
export function getTotalSubscriberCount(): number {
  let total = 0
  subscriptionRegistry.forEach((entry) => {
    total += entry.refCount
  })
  return total
}

/**
 * Force cleanup all subscriptions
 * Use only in testing or during logout
 */
export function cleanupAllSubscriptions(): void {
  const supabase = createClient()
  subscriptionRegistry.forEach((entry, channelName) => {
    console.log(`[useSharedSubscription] Force cleanup: "${channelName}"`)
    supabase.removeChannel(entry.channel)
  })
  subscriptionRegistry.clear()
}
