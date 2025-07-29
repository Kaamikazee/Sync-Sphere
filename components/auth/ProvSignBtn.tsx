"use client";

import { useProviderLoginError } from "@/hooks/useProviderLoginError";
import { signIn } from "next-auth/react";
import React, { useState } from "react";
import { Button } from "../ui/button";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>{
    children: React.ReactNode;
    providerName: "google" | "github";
    onLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const ProviderSignInBtn = ({children, onLoading, providerName, ...props}: Props) => {
  const [showLoggedInfo, setShowLoggedInfo] = useState(false);
  useProviderLoginError(showLoggedInfo)
  const signInHandler = async () => {
    setShowLoggedInfo(true)
    try {
        await signIn(providerName, {callbackUrl: `/onboarding`})
    } catch {
        // setShowLoggedInfo(false)
    }
    onLoading(false)
  };

  return <Button onClick={signInHandler} {...props} variant={"secondary"} type="button">
    {children}
  </Button>;
};

export default ProviderSignInBtn;
