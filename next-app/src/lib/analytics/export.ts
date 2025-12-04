/**
 * Analytics Export Utilities
 * Functions for exporting dashboard data to various formats
 */

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string = 'analytics-export'
): void {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get headers from first row
  const headers = Object.keys(data[0])

  // Build CSV content
  const csvRows: string[] = []

  // Add header row
  csvRows.push(headers.join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(value ?? '')
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  const csvContent = csvRows.join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up URL object
  URL.revokeObjectURL(url)
}

/**
 * Convert chart data to flat exportable format
 */
export function flattenChartData(
  chartData: Record<string, unknown>[],
  chartName: string
): Record<string, unknown>[] {
  return chartData.map((item, index) => ({
    chart: chartName,
    index: index + 1,
    ...item,
  }))
}

/**
 * Export multiple charts to a single CSV
 */
export function exportMultipleChartsToCSV(
  charts: { name: string; data: Record<string, unknown>[] }[],
  filename: string = 'dashboard-export'
): void {
  const allData: Record<string, unknown>[] = []

  for (const chart of charts) {
    const flatData = flattenChartData(chart.data, chart.name)
    allData.push(...flatData)
  }

  exportToCSV(allData, filename)
}

/**
 * Format date for filename
 */
export function getExportFilename(prefix: string): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}-${dateStr}`
}
