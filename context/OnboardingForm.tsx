"use client";

import {
  Action,
  ActionType,
  OnboardingFormContext,
  OnboardingFormReducer,
} from "@/types/onboardingContext";
import { Session } from "next-auth";
import { createContext, useContext, useReducer } from "react";

export const OnboardingFormCtx = createContext<OnboardingFormContext | null>(
  null
);

function onboardingFormReducer(state: OnboardingFormReducer, action: Action) {
  const { type, payload } = action;

  switch (type) {
    case ActionType.USERNAME: {
      return {
        ...state,
        username: payload as string,
      };
    }

    case ActionType.NAME: {
      return {
        ...state,
        name: payload as string,
      };
    }

    case ActionType.SURNAME: {
      return {
        ...state,
        surname: payload as string,
      };
    }
    case ActionType.PROFILEIMAGE: {
      return {
        ...state,
        profileImage: payload as string | null | undefined,
      };
    }
    case ActionType.GROUP_NAME: {
      return {
        ...state,
        groupName: payload as string,
      };
    }
    case ActionType.GROUP_IMAGE: {
      return {
        ...state,
        groupImage: payload as string | null | undefined,
      };
    }

    default:
      return state;
  }
}

const initialFormState: OnboardingFormReducer = {
  username: "null",
  name: "null",
  surname: "null",
  profileImage: null,
  groupName: "",
  groupImage: null,
};

interface Props {
  children: React.ReactNode;
  session: Session;
}

export const OnboardingFormProvider = ({ children, session }: Props) => {
  const [state, dispatch] = useReducer(onboardingFormReducer, {
    ...initialFormState,
    username: session.user.username,
    name: session.user.name,
    surname: session.user.surname,
    profileImage: session.user.image,
  });

  return (
    <OnboardingFormCtx.Provider value={{ ...state, dispatch }}>
      {children}
    </OnboardingFormCtx.Provider>
  );
};

export const useOnboardingForm = () => {
    const ctx = useContext(OnboardingFormCtx);
    if (!ctx) {
        throw new Error("Invalid User")
    }
    return ctx;
}
