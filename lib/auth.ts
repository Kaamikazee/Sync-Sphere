import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, NextAuthOptions } from "next-auth";
import db from "./db";
import { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { generateFromEmail } from "unique-username-generator";
import bcrypt from "bcrypt";
// import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      surname?: string | null;
      email?: string | null;
      image?: string | null;
      bio?: string | null;
      timezone?: string | null;
      resetHour?: number | null;
      createdAt?: Date | null;
      completedOnboarding?: boolean | null;
      username?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string | null;
    surname?: string | null;
    completedOnboarding?: boolean;
    bio?: string | null;
    createdAt?: Date | null;
    timezone?: string | null;
    resetHour?: number | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    error: "/sign-in",
    signIn: "/sign-in",
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      async profile(profile) {
        const username = generateFromEmail(profile.email, 5);
        return {
          id: profile.sub,
          username,
          name: profile.given_name ?? profile.name,
          surname: profile.family_name ?? "",
          email: profile.email,
          image: profile.picture,
        };
      },
    }),

    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      async profile(profile) {
        const username = generateFromEmail(profile.email, 5);
        const [firstName, lastName] = profile.name?.split(" ") ?? [];
        return {
          id: String(profile.id),
          username: profile.login ?? username,
          name: firstName ?? "",
          surname: lastName ?? "",
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const ok = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!ok) throw new Error("Invalid credentials");

        return user;
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      // First login
      if (user) {
        token.id = user.id;
        return token;
      }

      if (!token.email) return token;

      const dbUser = await db.user.findUnique({
        where: { email: token.email },
      });

      if (!dbUser) return token;

      token.id = dbUser.id;
      token.username = dbUser.username;
      token.name = dbUser.name;
      token.surname = dbUser.surname;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.completedOnboarding = dbUser.completedOnboarding;
      token.bio = dbUser.bio;
      token.createdAt = dbUser.createdAt;
      token.timezone = dbUser.timezone;
      token.resetHour = dbUser.resetHour;

      return token;
    },

    async session({ session, token }) {
      if (!session.user) return session;

      session.user.id = token.id;
      session.user.name = token.name;
      session.user.surname = token.surname;
      session.user.email = token.email;
      session.user.image = token.picture;
      session.user.username = token.username;
      session.user.completedOnboarding = token.completedOnboarding;
      session.user.bio = token.bio;
      session.user.createdAt = token.createdAt;
      session.user.timezone = token.timezone;
      session.user.resetHour = token.resetHour;

      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
