import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'

/**
 * Custom hook for handling API calls with automatic loading/error states
 * Provides consistent error handling and toast notifications
 * 
 * @param {function} apiFunction - The API function to wrap
 * @param {object} options - Configuration options
 * @param {boolean} options.showSuccessToast - Show success toast on completion
 * @param {boolean} options.showErrorToast - Show error toast on failure (default: true)
 * @param {string} options.successMessage - Custom success message
 * @param {string} options.errorMessage - Custom error message
 * 
 * @returns {object} { execute, loading, error, data, reset }
 * 
 * @example
 * const { execute, loading, error } = useAPI(
 *   () => couponService.deleteCoupon(id, token),
 *   { showSuccessToast: true, successMessage: 'Coupon deleted successfully' }
 * )
 * 
 * // Later in component
 * await execute()
 */
const useAPI = (apiFunction, options = {}) => {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed'
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiFunction(...args)
      setData(result)
      
      if (showSuccessToast) {
        toast.success(successMessage)
      }
      
      return result
    } catch (err) {
      const errorMsg = err?.message || errorMessage
      setError(errorMsg)
      
      if (showErrorToast) {
        toast.error(errorMsg)
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction, showSuccessToast, showErrorToast, successMessage, errorMessage])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return {
    execute,
    loading,
    error,
    data,
    reset
  }
}

export default useAPI
