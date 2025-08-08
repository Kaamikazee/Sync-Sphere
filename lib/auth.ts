import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, NextAuthOptions } from "next-auth";
import db from "./db";
import { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { generateFromEmail } from "unique-username-generator";
import bcrypt from "bcrypt";

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
          name: profile.given_name ? profile.given_name : profile.name,
          surname: profile.family_name ? profile.family_name : "",
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
        const fullName = profile.name.split(" ");
        return {
          id: profile.id,
          username: profile.login ? profile.login : username,
          name: fullName.at(0),
          surname: fullName.at(1),
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "Username",
        },
        email: {
          label: "Email",
          type: "text",
          placeholder: "Email",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Please enter Email and Password.");
        }
        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("User was not found, Please enter Valid email");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!passwordMatch) {
          throw new Error(
            "The entered password is incorrect, please enter the correct one."
          );
        }
        return user;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({session, token}) {
      if(token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.surname = token.surname;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.username = token.username;
        session.user.completedOnboarding = !!token.completedOnboarding;
        session.user.bio = typeof token.bio === "string" ? token.bio : null;
        session.user.createdAt = token.createdAt;
        session.user.timezone = token.timezone;
        session.user.resetHour = token.resetHour;
      }

      const user = await db.user.findUnique({
        where: {
          id: token.id
        }
      });

      if (user) {
        session.user.image = user.image;
        // session.user.completedOnboarding = user.c
        session.user.username = user.username;
        session.user.name = user.name;
      }

      return session;
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email
        }
      });
       if (!dbUser && user) {
    token.id = user.id;
    return token;
  }

  if (dbUser) {
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
  }

      return token; // ✅ Always return the token object
    }
  }
};



export const getAuthSession = () => getServerSession(authOptions);
