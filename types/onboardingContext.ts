export enum ActionType {
  NAME = "NAME",
  SURNAME = "SURNAME",
  USERNAME = "USERNAME",
  PROFILEIMAGE = "PROFILE_IMAGE",
  GROUP_NAME = "GROUP_NAME",
  GROUP_IMAGE = "GROUP_IMAGE",
}

export interface Action {
  type: ActionType;
  payload?: string | number | undefined | null;
}

export interface OnboardingFormReducer {
  username?: string | null;
  name?: string | null;
  surname?: string | null;
  profileImage?: string | null;
  groupName: string | null;
  groupImage?: string | null | undefined;
}

export interface OnboardingFormContext extends OnboardingFormReducer {
    dispatch: React.Dispatch<Action>;
}