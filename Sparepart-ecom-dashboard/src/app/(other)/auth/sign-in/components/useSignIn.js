'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'
const useSignIn = () => {
  const [loading, setLoading] = useState(false)
  const { push } = useRouter()
  const { showNotification } = useNotificationContext()
  const queryParams = useQueryParams()
  const loginFormSchema = yup.object({
    email: yup.string().email('Email is wrong').required('Required field'),
    password: yup.string().required('Required field'),
  })
  const { control, handleSubmit, setError, clearErrors } = useForm({
    resolver: yupResolver(loginFormSchema),
    // defaultValues: {
    //   email: 'user@demo.com',
    //   password: '123456',
    // },
  })
  const login = handleSubmit(async (values) => {
    setLoading(true)
    signIn('credentials', {
      redirect: false,
      email: values?.email,
      password: values?.password,
    }).then((res) => {
      if (res?.ok) {
        clearErrors()
        push(queryParams['redirectTo'] ?? '/dashboard')
        showNotification({
          message: 'Successfully logged in. Redirecting....',
          variant: 'success',
        })
      } else {
        const errorMessage = res?.error || 'Invalid credentials'
        if (errorMessage.toLowerCase().includes('email is wrong')) {
          clearErrors('password')
          setError('email', { type: 'manual', message: 'Email is wrong' }, { shouldFocus: true })
        } else if (errorMessage.toLowerCase().includes('password is wrong')) {
          clearErrors('email')
          setError('password', { type: 'manual', message: 'Email is Ok but password is wrong' }, { shouldFocus: true })
        } else {
          setError('password', { type: 'manual', message: 'Email is Ok but password is wrong' })
        }
        showNotification({
          message: errorMessage,
          variant: 'danger',
        })
      }
    })
    setLoading(false)
  })
  return {
    loading,
    login,
    control,
  }
}
export default useSignIn
