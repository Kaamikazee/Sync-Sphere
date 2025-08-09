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
    seenCount: number;
    seenPreview: {
    id: string;
    name: string | null;
}[],
seenByMe: boolean;
    replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  views: {
  id: string;
  username: string;
  name: string;
  image: string | null;
  seenAt: string | Date; // match your API return
}[];
}

export interface ViewsWithUser {
      id: string;
  username: string;
  name: string;
  image: string | null;
  seenAt: string | Date; // match your API return

}