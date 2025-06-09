import { Group, UserPermission } from "@prisma/client";

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