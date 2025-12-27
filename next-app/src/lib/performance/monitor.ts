/**
 * Performance Monitoring System for Adaptive Canvas Rendering
 *
 * Continuously tracks FPS, layout time, interaction lag, and memory usage
 * to automatically optimize rendering strategy (Canvas → Virtualized → WebGL)
 *
 * This prevents hard node-count thresholds and adapts to actual hardware performance
 */

export interface PerformanceMetrics {
  fps: number
  avgFPS: number
  layoutTime: number
  layoutTimeAvg: number
  interactionLag: number
  memoryUsed: number
  nodeCount: number
  edgeCount: number
  isLagging: boolean
  optimizationLevel: 'basic' | 'virtualized' | 'webgl'
  timestamp: number
}

export interface PerformanceThresholds {
  virtualization: {
    fps: number
    layoutTime: number
    interactionLag: number
  }
  webgl: {
    fps: number
    layoutTime: number
    interactionLag: number
    memoryPressure: number
  }
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  virtualization: {
    fps: 45,
    layoutTime: 1500, // ms
    interactionLag: 150, // ms
  },
  webgl: {
    fps: 30,
    layoutTime: 2500, // ms
    interactionLag: 200, // ms
    memoryPressure: 500, // MB
  },
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private measureInterval: NodeJS.Timeout | null = null
  private fpsHistory: number[] = []
  private layoutTimeHistory: number[] = []
  private lastFrameTime: number = performance.now()
  private frameCount: number = 0
  private thresholds: PerformanceThresholds
  private onOptimizationChange: (level: PerformanceMetrics['optimizationLevel']) => void

  constructor(
    onOptimizationChange: (level: PerformanceMetrics['optimizationLevel']) => void,
    thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS
  ) {
    this.onOptimizationChange = onOptimizationChange
    this.thresholds = thresholds
    this.metrics = {
      fps: 60,
      avgFPS: 60,
      layoutTime: 0,
      layoutTimeAvg: 0,
      interactionLag: 0,
      memoryUsed: 0,
      nodeCount: 0,
      edgeCount: 0,
      isLagging: false,
      optimizationLevel: 'basic',
      timestamp: Date.now(),
    }
  }

  /**
   * Start continuous performance monitoring
   */
  public startMonitoring(): void {
    if (this.measureInterval) return

    // Measure FPS every 100ms
    this.measureInterval = setInterval(() => {
      this.measureFPS()
      this.measureMemory()
      this.checkThresholds()
    }, 100)

    // Also track frame updates
    this.trackFrameUpdates()
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.measureInterval) {
      clearInterval(this.measureInterval)
      this.measureInterval = null
    }
  }

  /**
   * Record layout calculation time
   */
  public recordLayoutTime(timeMs: number): void {
    this.metrics.layoutTime = timeMs
    this.layoutTimeHistory.push(timeMs)

    // Keep last 10 measurements
    if (this.layoutTimeHistory.length > 10) {
      this.layoutTimeHistory.shift()
    }

    // Calculate average
    this.metrics.layoutTimeAvg =
      this.layoutTimeHistory.reduce((sum, t) => sum + t, 0) / this.layoutTimeHistory.length
  }

  /**
   * Record interaction lag (time from user action to visual update)
   */
  public recordInteractionLag(lagMs: number): void {
    this.metrics.interactionLag = lagMs
  }

  /**
   * Update node/edge counts
   */
  public updateGraphSize(nodeCount: number, edgeCount: number): void {
    this.metrics.nodeCount = nodeCount
    this.metrics.edgeCount = edgeCount
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Measure current FPS
   */
  private measureFPS(): void {
    const now = performance.now()
    const delta = now - this.lastFrameTime
    const currentFPS = 1000 / delta

    this.metrics.fps = Math.min(currentFPS, 60) // Cap at 60 FPS
    this.fpsHistory.push(this.metrics.fps)

    // Keep last 30 measurements (3 seconds at 100ms intervals)
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift()
    }

    // Calculate average FPS
    this.metrics.avgFPS =
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length

    this.lastFrameTime = now
    this.frameCount++
  }

  /**
   * Measure memory usage (if available)
   */
  private measureMemory(): void {
    interface PerformanceMemory {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
    interface PerformanceWithMemory extends Performance {
      memory?: PerformanceMemory
    }
    const perfWithMemory = performance as PerformanceWithMemory
    if (perfWithMemory.memory) {
      this.metrics.memoryUsed = perfWithMemory.memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
  }

  /**
   * Track frame updates using requestAnimationFrame
   */
  private trackFrameUpdates(): void {
    const trackFrame = () => {
      const now = performance.now()
      this.lastFrameTime = now
      requestAnimationFrame(trackFrame)
    }
    requestAnimationFrame(trackFrame)
  }

  /**
   * Check performance thresholds and trigger optimization changes
   */
  private checkThresholds(): void {
    const { avgFPS, layoutTimeAvg, interactionLag, optimizationLevel } = this.metrics
    const { virtualization, webgl } = this.thresholds

    let newLevel: PerformanceMetrics['optimizationLevel'] = optimizationLevel
    let shouldChange = false

    // Check if we need WebGL (most aggressive optimization)
    if (
      avgFPS < webgl.fps ||
      layoutTimeAvg > webgl.layoutTime ||
      interactionLag > webgl.interactionLag ||
      this.metrics.memoryUsed > webgl.memoryPressure
    ) {
      newLevel = 'webgl'
      shouldChange = optimizationLevel !== 'webgl'
    }
    // Check if we need virtualization (moderate optimization)
    else if (
      avgFPS < virtualization.fps ||
      layoutTimeAvg > virtualization.layoutTime ||
      interactionLag > virtualization.interactionLag
    ) {
      newLevel = 'virtualized'
      shouldChange = optimizationLevel !== 'virtualized'
    }
    // Performance is good, use basic rendering
    else if (avgFPS >= virtualization.fps + 5) {
      // Add 5 FPS hysteresis to prevent bouncing
      newLevel = 'basic'
      shouldChange = optimizationLevel !== 'basic'
    }

    // Update lagging status
    this.metrics.isLagging = avgFPS < 30 || layoutTimeAvg > 2000

    // Trigger optimization change if needed
    if (shouldChange) {
      console.log(`[PerformanceMonitor] Optimization level changed: ${optimizationLevel} → ${newLevel}`, {
        avgFPS: avgFPS.toFixed(1),
        layoutTimeAvg: layoutTimeAvg.toFixed(0),
        interactionLag,
        memoryUsed: this.metrics.memoryUsed.toFixed(1),
      })

      this.metrics.optimizationLevel = newLevel
      this.onOptimizationChange(newLevel)
    }

    this.metrics.timestamp = Date.now()
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopMonitoring()
    this.fpsHistory = []
    this.layoutTimeHistory = []
  }
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(
  onOptimizationChange: (level: PerformanceMetrics['optimizationLevel']) => void,
  thresholds?: PerformanceThresholds
) {
  if (typeof window === 'undefined') {
    return null
  }

  const monitor = new PerformanceMonitor(onOptimizationChange, thresholds)
  monitor.startMonitoring()

  return monitor
}
