'use client'

import { Form, Spinner } from 'react-bootstrap'

/**
 * Reusable status toggle switch component
 * Provides consistent styling and loading states across the dashboard
 * 
 * @param {boolean} checked - Current status (true = active, false = inactive)
 * @param {function} onChange - Handler when toggle changes (receives new status as boolean)
 * @param {boolean} loading - Whether toggle is currently updating (shows spinner)
 * @param {string} label - Optional label to display next to toggle
 * @param {boolean} disabled - Whether toggle is disabled
 * @param {string} size - Size of switch ('sm' or default)
 */
const StatusToggle = ({
  checked,
  onChange,
  loading = false,
  label,
  disabled = false,
  size
}) => {
  const handleChange = (e) => {
    if (!loading && !disabled && onChange) {
      onChange(e.target.checked)
    }
  }

  return (
    <div className="d-flex align-items-center gap-2">
      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : (
        <Form.Check
          type="switch"
          checked={checked}
          onChange={handleChange}
          disabled={disabled || loading}
          className={size === 'sm' ? 'form-check-sm' : ''}
          label={label}
        />
      )}
    </div>
  )
}

export default StatusToggle
