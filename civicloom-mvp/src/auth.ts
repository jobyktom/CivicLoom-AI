import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";

type CredentialUser = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
};

const prisma = getPrismaClient();
const usePrismaAdapter = process.env.AUTH_PRISMA_ADAPTER === "true" && prisma;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: usePrismaAdapter ? PrismaAdapter(prisma) : undefined,
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password || !prisma) return null;

        const rows = await prisma.$queryRaw<CredentialUser[]>`
          SELECT id,email,name,password_hash
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `;
        const user = rows[0];
        const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
        if (!user || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
