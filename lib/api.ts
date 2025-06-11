import { GroupWithSubscribers } from "@/types/extended";
import { Activity, Group, PomodoroSettings, UserPermission } from "@prisma/client";

export const domain =
  process.env.NODE_ENV !== "production"
    ? "http://localhost:3000"
    : "http://localhost:3000";

export const getGroups = async (userId: string) => {
  const res = await fetch(`${domain}/api/group/user_groups/?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return []
  }

  return res.json() as Promise<Group[]>
};
export const getGroup = async (group_id: string, userId: string) => {
  const res = await fetch(`${domain}/api/group/get/group_details/${group_id}?userId=${userId}`, {
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
        `${domain}/api/group/get/user_role?groupId=${group_id}&userId=${userId}`,
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
  const res = await fetch(`${domain}/api/group/get/subscribers/${group_id}?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<GroupWithSubscribers>
};

export const getUserPomodoroSettings = async (userId: string) => {
  const res = await fetch(`${domain}/api/pomodoro/get_settings?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<PomodoroSettings>
};

export const getActivities = async (userId: string) => {
  const res = await fetch(`${domain}/api/activity/user_activities?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<Activity[]>
};
export const getActivityTimeSpent = async (activityId: string) => {
  const res = await fetch(`${domain}/api/activity?activityId=${activityId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<number>
};

export interface TotalTimeOfUser {
  userId: string,
  name: string,
  image: string,
  totalSeconds: number,
}


export const totalTimeOfUser = async (groupId: string) => {
  const res = await fetch(`${domain}/api/activity?group=${groupId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<TotalTimeOfUser[]>
};

export const getTotalSecondsOfUser = async (userId: string) => {
  const res = await fetch(`${domain}/api/simple_timer?userId=${userId}`, {
    method: "GET",
    cache: "no-store",
  });

  if(!res.ok) {
    return null
  }

  return res.json() as Promise<TotalTimeOfUser>
};
