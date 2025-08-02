import { GroupWithSubscribers } from "@/types/extended";
import { Activity, Announcement, FocusArea, Group, GroupIconColor, Notification, PomodoroSettings, SegmentType, Todo, UserPermission } from "@prisma/client";

export const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

export const domain =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:3000"
    : "http://localhost:3000";


export interface GroupsWithUserName {
  userName: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    creatorId: string | null;
    image: string | null;
    color: GroupIconColor;
    inviteCode: string;
    adminCode: string;
    canEditCode: string;
    readOnlyCode: string;
}

export const getGroups = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/group/user_groups/?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return []
  }

  return res.json() as Promise<GroupsWithUserName[]>
};
export const getGroup = async (group_id: string, userId: string) => {
  const res = await fetch(`${baseUrl}/api/group/get/group_details/${group_id}?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Group>
};

export const getUserGroupRole = async (group_id: string, userId: string) => {
    const res = await fetch(
        `${baseUrl}/api/group/get/user_role?groupId=${group_id}&userId=${userId}`,
        {
            method: 'GET',
            cache: 'no-store'
        }
    )

    if (!res.ok) {
        return null;
      }

    return res.json() as Promise<UserPermission>;
};

export const getGroupWithSubscribers = async (group_id: string, userId: string) => {
  const res = await fetch(`${baseUrl}/api/group/get/subscribers/${group_id}?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<GroupWithSubscribers>
};

export const getUserPomodoroSettings = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/pomodoro/get_settings?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<PomodoroSettings>
};

export const getActivities = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/activity/user_activities?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Activity[]>
};

export const getActivityTimeSpent = async (activityId: string) => {
  const res = await fetch(`${baseUrl}/api/activity?activityId=${activityId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<number>
};

export interface TotalTimeOfUser {
  totalSeconds: number;
    user: {
        name: string | null;
        id: string;
        image: string | null;
    };
    isRunning: boolean;
    startTimestamp: Date | null;
}


export const totalTimeOfUser = async (groupId: string) => {
  const res = await fetch(`${baseUrl}/api/activity?group=${groupId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<TotalTimeOfUser[]>
};

export const getTotalSecondsOfUser = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/simple_timer?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<TotalTimeOfUser>
};

export const getTodos = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/todos/get?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Todo[]>
};

export const getAnnouncements = async (groupId: string) => {
  const res = await fetch(`${baseUrl}/api/announcement/get?groupId=${groupId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Announcement[]>
};

export const getAnnouncementDetail = async (announcementId: string) => {
  const res = await fetch(`${baseUrl}/api/announcement/get/detail?announcementId=${announcementId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Announcement>
};


export interface membersWithSeconds {
   user: {
        id: string;
        name: string | null;
        image: string | null;
        totalSeconds: number;
        isRunning: boolean;
        startTimestamp: Date | null;
    };
}

export const getSubscribersWithTotalSeconds = async (group_id: string) => {
  const res = await fetch(`${baseUrl}/api/simple_timer/get?groupId=${group_id}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<membersWithSeconds[]>
};


export const getFocusAreas = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/focus_area/get?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<FocusArea[]>
};

export interface FocusAreTotalsById {
  focusAreaId: string;
    totalDuration: number;
}

export const getFocusAreaTotals = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/focus_area/get/totals?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<FocusAreTotalsById[]>
}

export interface GroupIdAndSubscribers {
    groupId: string;
    users: {
        id: string;
        name: string | null;
        image: string | null;
        totalSeconds: number;
        isRunning: boolean;
        startTimestamp: Date | null;
    }[];
}
export const getGroupIdAndSubscribers = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/group/user_groups/subscribers?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<GroupIdAndSubscribers[][]>
}

export interface SegmentTypes {
   id: string;
    start: Date;
    end: Date | null;
    duration: number | null;
    date: Date;
     type: SegmentType;
    label: string | null;
    focusArea: {
        id: string;
        name: string;
    };
}

export const getAllSegments = async (userId: string) => {
  const res = await fetch(`${baseUrl}/api/segments/get?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<SegmentTypes[]>
}
export const getAllNotifications = async () => {
  const res = await fetch(`${baseUrl}/api/notifications/get`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Notification[]>
}
