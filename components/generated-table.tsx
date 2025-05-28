"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable, createSortableHeader, createCheckboxColumn } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"
import { TableConfig } from "@/lib/ai/tools/generate-table"

interface GeneratedTableProps {
  config: TableConfig
}

// Format different data types
const formatCellValue = (value: any, type: string) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  switch (type) {
    case 'currency':
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue)) return value
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(numValue)

    case 'percentage':
      const pctValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(pctValue)) return value
      return `${(pctValue * 100).toFixed(2)}%`

    case 'number':
      const numberValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numberValue)) return value
      return new Intl.NumberFormat('en-US').format(numberValue)

    case 'date':
      try {
        const date = new Date(value)
        if (isNaN(date.getTime())) return value
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch {
        return value
      }

    case 'boolean':
      if (typeof value === 'boolean') {
        return value ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Yes</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>No</span>
          </div>
        )
      }
      // Handle string representations
      const boolStr = String(value).toLowerCase()
      if (boolStr === 'true' || boolStr === 'yes' || boolStr === '1') {
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Yes</span>
          </div>
        )
      }
      if (boolStr === 'false' || boolStr === 'no' || boolStr === '0') {
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>No</span>
          </div>
        )
      }
      return value

    case 'text':
    default:
      // Handle status-like text with badges
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase()
        if (['active', 'success', 'completed', 'approved'].includes(lowerValue)) {
          return <Badge variant="default" className="bg-green-100 text-green-800">{value}</Badge>
        }
        if (['inactive', 'failed', 'error', 'rejected'].includes(lowerValue)) {
          return <Badge variant="destructive">{value}</Badge>
        }
        if (['pending', 'processing', 'in-progress'].includes(lowerValue)) {
          return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{value}</Badge>
        }
        if (['draft', 'paused', 'on-hold'].includes(lowerValue)) {
          return <Badge variant="outline">{value}</Badge>
        }
      }
      return value
  }
}

export function GeneratedTable({ config }: GeneratedTableProps) {
  // Create columns based on the configuration
  const columns: ColumnDef<any>[] = []

  // Add checkbox column if row selection is enabled
  if (config.enableRowSelection) {
    columns.push(createCheckboxColumn())
  }

  // Add data columns
  config.columns.forEach((col) => {
    const column: ColumnDef<any> = {
      accessorKey: col.key,
      header: col.sortable ? createSortableHeader(col.header) : col.header,
      cell: ({ row }) => {
        const value = row.getValue(col.key)
        return (
          <div style={{ width: col.width }}>
            {formatCellValue(value, col.type)}
          </div>
        )
      },
      enableSorting: col.sortable,
      enableHiding: true,
    }

    columns.push(column)
  })

  return (
    <div className="w-full space-y-4">
      <DataTable
        columns={columns}
        data={config.data}
        searchKey={config.searchKey}
        title={config.title}
        description={config.description}
      />
      
      {config.data.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {Math.min(config.pageSize, config.data.length)} of {config.data.length} rows
        </div>
      )}
    </div>
  )
} 