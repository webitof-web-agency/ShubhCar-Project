'use client'

import TextFormInput from '@/components/form/TextFormInput'
import Link from 'next/link'
import { Button, FormCheck } from 'react-bootstrap'
import useSignIn from './useSignIn'
import PasswordFormInput from '@/components/form/PasswordFormInput'
const LoginFrom = () => {
  const { loading, login, control } = useSignIn()
  return (
    <form className="authentication-form auth-modern__form" onSubmit={login}>
      <TextFormInput
        control={control}
        name="email"
        containerClassName="mb-3 auth-modern__field"
        label="Admin email"
        labelClassName="auth-floating__label"
        floatingLabel
        id="email-id"
      />

      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3 auth-modern__field"
        label="Password"
        labelClassName="auth-floating__label"
        // labelRight={
        //   <Link href="/auth/reset-pass" className="auth-modern__link">
        //     Reset password
        //   </Link>
        // }
        floatingLabel
        id="password-id"
      />
      <div className="mb-3 d-flex align-items-center justify-content-between">
        <FormCheck label="Remember me" id="sign-in" className="auth-modern__check" />
        <span className="auth-modern__hint">Protected by enterprise-grade encryption</span>
      </div>
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={loading} className="auth-modern__submit">
          LOGIN NOW
        </Button>
      </div>
    </form>
  )
}
export default LoginFrom
