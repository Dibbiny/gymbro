import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the auth configuration.
// Does NOT import bcryptjs or Prisma — safe to run in CF Workers middleware.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: string }).role;
        token.avatarUrl = (user as { avatarUrl: string | null }).avatarUrl;
        token.experiencePoints = (user as { experiencePoints: number }).experiencePoints;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.experiencePoints = token.experiencePoints as number;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
} satisfies NextAuthConfig;
