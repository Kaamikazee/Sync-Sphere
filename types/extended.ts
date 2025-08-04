import { Group, Message, UserPermission } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    bio?: string | null;
    joinedAt?: string;
    completedOnboarding?: boolean;
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      surname?: string | null;
      email?: string | null;
      image?: string | null;
      bio?: string | null;
      joinedAt?: string | null;
      completedOnboarding?: boolean | null;
      username?: string | null;
    };
  }
}

export interface SubscriptionUser {
    userRole: UserPermission;
    user: {
        id: string;
        image?: string | null;
        username: string;
        name: string;
        surname: string;
    }
}

export interface GroupWithSubscribers extends Group {
    subscribers: SubscriptionUser[]
}

export interface MessageWithSenderInfo extends Message {
    senderName: string;
    senderImage: string;
    replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
}