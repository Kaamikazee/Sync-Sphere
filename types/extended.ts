import { Chat, Group, Message, MessageView, UserPermission } from "@prisma/client";
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

export interface MessagesWithViews extends Message {
    views: MessageView[]
}

export interface ChatWithMessage extends Chat {
    messages: MessagesWithViews[]
}

export interface GroupWithSubscribers extends Group {
    subscribers: SubscriptionUser[]
    chat: ChatWithMessage[]
}

export interface MessageWithSenderInfo extends Message {
    senderName: string;
    senderImage: string;
    replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  views: {
    userId: string;
    seenAt: Date; // or Date — depending on how it's returned from your API
  }[];
}