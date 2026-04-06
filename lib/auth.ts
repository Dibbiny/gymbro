import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username: rawUsername, password } = parsed.data;
        const username = rawUsername.toLowerCase();

        const user = await db.user.findFirst({
          where: { username: { equals: username, mode: "insensitive" } },
          select: {
            id: true,
            username: true,
            email: true,
            passwordHash: true,
            avatarUrl: true,
            role: true,
            experiencePoints: true,
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          experiencePoints: user.experiencePoints,
        };
      },
    }),
  ],
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
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
