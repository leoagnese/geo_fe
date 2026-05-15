/**
 * NextAuth v5 configuration — Keycloak OIDC provider.
 *
 * Passes the Keycloak access_token through to the session so that
 * server components and client components can use it for BE API calls.
 *
 * @spec L1_design/screen-inventory.md §"Auth (SC-001)"
 * @implements US-001
 * @validates AC-001, AC-002, AC-003
 */
import NextAuth from 'next-auth'
import KeycloakProvider from 'next-auth/providers/keycloak'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

// Extend the built-in session/jwt types to include our custom fields
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

/**
 * Extract the primary realm role from a Keycloak JWT claim.
 * Keycloak stores realm roles in `realm_access.roles[]`.
 */
function extractRole(token: JWT & { realm_access?: { roles?: string[] } }): 'analyst' | 'admin' {
  const roles: string[] = token.realm_access?.roles ?? []
  if (roles.includes('admin')) return 'admin'
  return 'analyst'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],

  callbacks: {
    /**
     * jwt() — called every time a token is created or refreshed.
     * On initial sign-in: persists access_token + refresh_token + role.
     * On subsequent calls: returns the cached token (or refreshes if expired).
     */
    async jwt({ token, account, profile }) {
      // Initial sign-in: account and profile are available
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          role: extractRole(token as JWT & { realm_access?: { roles?: string[] } }),
        }
      }

      // Token still valid
      if (Date.now() < (token.accessTokenExpires ?? 0)) {
        return token
      }

      // Token expired — attempt refresh
      try {
        const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.KEYCLOAK_CLIENT_ID!,
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken ?? '',
          }),
        })

        const refreshed = (await response.json()) as {
          access_token: string
          refresh_token: string
          expires_in: number
        }

        if (!response.ok) throw refreshed

        return {
          ...token,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
        }
      } catch {
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },

    /**
     * session() — shapes the session object exposed to client code via useSession().
     * Copies accessToken and role from the JWT into the session.
     */
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
