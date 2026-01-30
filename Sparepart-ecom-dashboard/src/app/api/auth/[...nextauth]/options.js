import CredentialsProvider from 'next-auth/providers/credentials'
import { randomBytes } from 'crypto'
import { API_BASE_URL } from '@/helpers/apiBase'

export const options = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email:',
          type: 'text',
          placeholder: 'Enter your email',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Call backend login API
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: credentials.email,
              password: credentials.password,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.message || 'Invalid credentials')
          }

          // Backend returns: { success: true, data: { accessToken, refreshToken, user } }
          if (data.success && data.data) {
            return {
              id: data.data.user._id,
              email: data.data.user.email,
              name: `${data.data.user.firstName} ${data.data.user.lastName}`,
              role: data.data.user.role,
              firstName: data.data.user.firstName,
              lastName: data.data.user.lastName,
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            }
          }

          throw new Error('Invalid response from server')
        } catch (error) {
          console.error('Login error:', error)
          throw new Error(error.message || 'Authentication failed')
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'kvwLrfri/MBznUCofIoRH9+NvGu6GqvVdqO3mor1GuA=',
  pages: {
    signIn: '/auth/sign-in',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.userId = user.id
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user = {
          id: token.userId,
          email: token.email,
          name: token.name,
          role: token.role,
          firstName: token.firstName,
          lastName: token.lastName,
        }
        session.accessToken = token.accessToken
        session.refreshToken = token.refreshToken
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
}
