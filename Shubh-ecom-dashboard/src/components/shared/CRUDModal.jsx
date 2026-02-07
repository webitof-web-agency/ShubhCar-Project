import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

/**
 * Generic CRUD Modal for Create/Edit operations
 * 
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Handler to close modal
 * @param {function} onSubmit - Handler when form is submitted (receives formData)
 * @param {string} title - Modal title
 * @param {boolean} editMode - Whether in edit mode (vs create mode)
 * @param {Array} fields - Array of field configurations
 * @param {Object} initialData - Initial form data (for edit mode)
 * @param {boolean} submitting - Whether submission is in progress
 * @param {string} error - Error message to display
 * @param {string} submitLabel - Custom submit button label
 * @param {string} icon - Icon for modal header
 * 
 * Field Configuration:
 * {
 *   name: string,          // Field name (key in formData)
 *   label: string,         // Display label
 *   type: string,          // 'text', 'textarea', 'select', 'number', 'email', 'file', 'checkbox', 'custom'
 *   placeholder: string,   // Placeholder text
 *   required: boolean,     // Whether field is required
 *   options: Array,        // For select: [{value, label}]
 *   rows: number,          // For textarea: number of rows
 *   accept: string,        // For file: accepted file types
 *   min: number,           // For number: min value
 *   max: number,           // For number: max value
 *   disabled: boolean,     // Whether field is disabled
 *   helpText: string,      // Help text below field
 *   render: function,      // Custom render function (formData, setFormData) => ReactNode
 *   validate: function,    // Custom validation (value) => error message or null
 * }
 */
const CRUDModal = ({
  show,
  onHide,
  onSubmit,
  title,
  editMode = false,
  fields = [],
  initialData = {},
  submitting = false,
  error = null,
  submitLabel,
  icon
}) => {
  const [formData, setFormData] = useState({})
  const [validationErrors, setValidationErrors] = useState({})

  // Initialize form data
  useEffect(() => {
    if (show) {
      const initialValues = {}
      fields.forEach(field => {
        initialValues[field.name] = initialData[field.name] ?? 
          (field.type === 'checkbox' ? false : '')
      })
      setFormData(initialValues)
      setValidationErrors({})
    }
  }, [show, initialData, fields])

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const validate = () => {
    const errors = {}
    
    fields.forEach(field => {
      const value = formData[field.name]
      
      // Required field validation
      if (field.required && !value && value !== 0) {
        errors[field.name] = `${field.label} is required`
      }
      
      // Custom validation
      if (field.validate && value) {
        const customError = field.validate(value)
        if (customError) {
          errors[field.name] = customError
        }
      }
      
      // Type-based validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors[field.name] = 'Invalid email address'
        }
      }
      
      if (field.type === 'number' && value !== '') {
        if (field.min !== undefined && value < field.min) {
          errors[field.name] = `Minimum value is ${field.min}`
        }
        if (field.max !== undefined && value > field.max) {
          errors[field.name] = `Maximum value is ${field.max}`
        }
      }
    })
    
    return errors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    
    // Submit
    onSubmit(formData)
  }

  const renderField = (field) => {
    const value = formData[field.name] ?? ''
    const hasError = !!validationErrors[field.name]
    
    // Custom render
    if (field.type === 'custom' && field.render) {
      return (
        <Form.Group key={field.name} className="mb-3">
          {field.label && <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>}
          {field.render(formData, setFormData)}
          {hasError && <Form.Control.Feedback type="invalid" className="d-block">{validationErrors[field.name]}</Form.Control.Feedback>}
          {field.helpText && <Form.Text className="text-muted">{field.helpText}</Form.Text>}
        </Form.Group>
      )
    }
    
    // Textarea
    if (field.type === 'textarea') {
      return (
        <Form.Group key={field.name} className="mb-3">
          <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
          <Form.Control
            as="textarea"
            rows={field.rows || 3}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || submitting}
            isInvalid={hasError}
          />
          {hasError && <Form.Control.Feedback type="invalid">{validationErrors[field.name]}</Form.Control.Feedback>}
          {field.helpText && <Form.Text className="text-muted">{field.helpText}</Form.Text>}
        </Form.Group>
      )
    }
    
    // Select
    if (field.type === 'select') {
      return (
        <Form.Group key={field.name} className="mb-3">
          <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
          <Form.Select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled || submitting}
            isInvalid={hasError}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Form.Select>
          {hasError && <Form.Control.Feedback type="invalid">{validationErrors[field.name]}</Form.Control.Feedback>}
          {field.helpText && <Form.Text className="text-muted">{field.helpText}</Form.Text>}
        </Form.Group>
      )
    }
    
    // Checkbox
    if (field.type === 'checkbox') {
      return (
        <Form.Group key={field.name} className="mb-3">
          <Form.Check
            type="checkbox"
            label={field.label}
            checked={!!value}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            disabled={field.disabled || submitting}
            isInvalid={hasError}
          />
          {hasError && <Form.Control.Feedback type="invalid" className="d-block">{validationErrors[field.name]}</Form.Control.Feedback>}
          {field.helpText && <Form.Text className="text-muted d-block">{field.helpText}</Form.Text>}
        </Form.Group>
      )
    }
    
    // Default: Input (text, number, email, etc.)
    return (
      <Form.Group key={field.name} className="mb-3">
        <Form.Label>{field.label} {field.required && <span className="text-danger">*</span>}</Form.Label>
        <Form.Control
          type={field.type || 'text'}
          value={value}
          onChange={(e) => handleChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled || submitting}
          isInvalid={hasError}
          min={field.min}
          max={field.max}
          accept={field.accept}
        />
        {hasError && <Form.Control.Feedback type="invalid">{validationErrors[field.name]}</Form.Control.Feedback>}
        {field.helpText && <Form.Text className="text-muted">{field.helpText}</Form.Text>}
      </Form.Group>
    )
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          {icon && <IconifyIcon icon={icon} className="fs-4" />}
          {title || `${editMode ? 'Edit' : 'Create'} Item`}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              <IconifyIcon icon="solar:danger-circle-bold" className="me-2" />
              {error}
            </Alert>
          )}
          {fields.map(field => renderField(field))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {editMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <IconifyIcon icon={editMode ? "solar:diskette-bold" : "solar:add-circle-bold"} className="me-1" />
                {submitLabel || (editMode ? 'Update' : 'Create')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default CRUDModal
