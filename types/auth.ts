import type { User } from "next-auth";

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

declare module "next-auth" {
  interface Session {
    user: User & {
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
