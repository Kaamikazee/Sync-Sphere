import { Group, Message, UserPermission } from "@prisma/client";
import "next-auth";


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