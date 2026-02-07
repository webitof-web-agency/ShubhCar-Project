'use client'

import { Table, Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

/**
 * Reusable data table component with common patterns
 * 
 * @param {array} columns - Column definitions: [{ key, label, render?, width?, className? }]
 * @param {array} data - Rows of data to display
 * @param {function} renderRow - Custom row renderer (row, index) => JSX
 * @param {boolean} loading - Show loading spinner
 * @param {string} emptyMessage - Message when no data
 * @param {boolean} hoverable - Enable row hover effect (default: true)
 * @param {boolean} centered - Center-align table content (default: true)
 * @param {string} className - Additional class names
 * @param {function} getRowKey - Function to extract unique key from row (default: row._id)
 * 
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', label: 'Name' },
 *     { key: 'email', label: 'Email' },
 *     { key: 'actions', label: 'Actions', render: (row) => <button>Edit</button> }
 *   ]}
 *   data={users}
 *   loading={loading}
 * />
 */
const DataTable = ({
  columns = [],
  data = [],
  renderRow,
  loading = false,
  emptyMessage = 'No data available',
  hoverable = true,
  centered = true,
  className = '',
  getRowKey = (row) => row._id || row.id
}) => {
  const tableClasses = [
    'table',
    'align-middle',
    'mb-0',
    hoverable && 'table-hover',
    centered && 'table-centered',
    className
  ].filter(Boolean).join(' ')

  // Default row renderer if not provided
  const defaultRenderRow = (row, rowIndex) => (
    <tr key={getRowKey(row, rowIndex)}>
      {columns.map((col, colIndex) => {
        const value = col.render
          ? col.render(row, rowIndex)
          : row[col.key]

        return (
          <td
            key={`${getRowKey(row, rowIndex)}-${col.key || colIndex}`}
            style={col.width ? { width: col.width } : undefined}
            className={col.className}
          >
            {value}
          </td>
        )
      })}
    </tr>
  )

  const rowRenderer = renderRow || defaultRenderRow

  return (
    <div className="table-responsive">
      <Table className={tableClasses}>
        <thead className="bg-light-subtle">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={col.width ? { width: col.width } : undefined}
                className={col.headerClassName}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2 mb-0 text-muted">Loading...</p>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => rowRenderer(row, index))
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default DataTable
