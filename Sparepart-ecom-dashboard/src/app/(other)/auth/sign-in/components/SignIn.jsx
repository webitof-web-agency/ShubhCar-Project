'use client'

import logoDark from '@/assets/images/logo-dark.png'
import logoLight from '@/assets/images/logo-light.png'
import Image from 'next/image'
import LoginFrom from './LoginFrom'
import { Col, Row } from 'react-bootstrap'

const SignIn = () => {
  return (
    <div className="auth-modern auth-modern--minimal">
      <Row className="auth-modern__grid g-0">
        <Col lg={12} className="auth-modern__form-col">
          <div className="auth-modern__card">
            <div className="auth-modern__logo-float">
              <div className="auth-logo">
                <div className="logo-dark">
                  <Image src={logoDark} height={32} alt="logo dark" />
                </div>
                <div className="logo-light">
                  <Image src={logoLight} height={32} alt="logo light" />
                </div>
              </div>
            </div>
            <span className="auth-modern__badge auth-modern__badge--floating">Admin Console</span>
            <div className="auth-modern__brand">
            </div>

            <h1 className="auth-modern__title">ADMIN LOGIN</h1>
            <p className="auth-modern__subtitle">Access your dashboard with your credentials.</p>

            <div className="auth-modern__form-wrap">
              <LoginFrom />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default SignIn
