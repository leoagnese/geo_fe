/**
 * NextAuth v5 — Keycloak via Credentials provider (ROPC flow).
 *
 * The login form lives on the GeoTool FE (SC-001). Credentials are exchanged
 * directly with Keycloak's token endpoint — no redirect to localhost:8080.
 *
 * @implements US-001
 * @validates AC-001, AC-002, AC-003
 */
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
    refreshToken: string
    accessTokenExpires: number
    role: 'analyst' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    role?: 'analyst' | 'admin'
    error?: string
  }
}

interface KcPayload {
  sub: string
  email?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
}

function extractRole(payload: KcPayload): 'analyst' | 'admin' {
  const roles = payload.realm_access?.roles ?? []
  return roles.includes('admin') ? 'admin' : 'analyst'
}

function decodeJwt(token: string): KcPayload {
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString(),
  ) as KcPayload
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID!,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken ?? '',
        }),
      },
    )
    const data = (await res.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }
    if (!res.ok) throw data

    const payload = decodeJwt(data.access_token)
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      role: extractRole(payload),
      error: undefined,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username o email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        try {
          const res = await fetch(
            `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.KEYCLOAK_CLIENT_ID!,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
                grant_type: 'password',
                username: credentials.username as string,
                password: credentials.password as string,
              }),
            },
          )

          if (!res.ok) return null

          const data = (await res.json()) as {
            access_token: string
            refresh_token: string
            expires_in: number
          }

          const payload = decodeJwt(data.access_token)
          const roles = payload.realm_access?.roles ?? []
          if (!roles.includes('admin') && !roles.includes('analyst')) return null

          return {
            id: payload.sub,
            email: payload.email ?? (credentials.username as string),
            name: payload.preferred_username as string ?? (credentials.username as string),
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            accessTokenExpires: Date.now() + data.expires_in * 1000,
            role: extractRole(payload),
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
          refreshToken: user.refreshToken,
          accessTokenExpires: user.accessTokenExpires,
          role: user.role,
        }
      }
      if (Date.now() < (token.accessTokenExpires ?? 0)) return token
      return refreshAccessToken(token)
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
