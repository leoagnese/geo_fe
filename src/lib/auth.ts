import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'analyst' | 'admin'
    }
    error?: string
  }
  interface User {
    accessToken: string
    accessTokenExpires: number
    role: 'analyst' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    accessTokenExpires?: number
    role?: 'analyst' | 'admin'
    error?: string
  }
}

interface LocalJwtPayload {
  sub: string
  email?: string
  realm_access?: { roles?: string[] }
  exp: number
}

function decodeJwt(token: string): LocalJwtPayload {
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString(),
  ) as LocalJwtPayload
}

const BE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 28800 },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        try {
          const res = await fetch(`${BE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.username,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const body = (await res.json()) as { data?: { access_token: string }; access_token?: string }
          const accessToken = body.data?.access_token ?? body.access_token
          if (!accessToken) return null

          const payload = decodeJwt(accessToken)
          const roles = payload.realm_access?.roles ?? []
          const role = roles.includes('admin') ? 'admin' : 'analyst'

          if (!roles.includes('admin') && !roles.includes('analyst')) return null

          return {
            id: payload.sub,
            email: payload.email ?? (credentials.username as string),
            name: payload.email ?? (credentials.username as string),
            accessToken,
            accessTokenExpires: payload.exp * 1000,
            role,
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    authorized({ auth: session }) {
      return !!session
    },

    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          accessTokenExpires: user.accessTokenExpires,
          role: user.role,
        }
      }
      return token
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken ?? '',
        user: {
          ...session.user,
          id: token.sub ?? '',
          role: token.role ?? 'analyst',
        },
        error: token.error,
      } as Session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})
