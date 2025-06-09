"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export const useProviderLoginError = (showLoggedInfo: boolean) => {
  const params = useSearchParams();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    const error = params.get("error");
    if (error && session.status === "authenticated") {
      switch (error) {
        case "OAuthAccountNotLinked":
          toast.error("This email is already in use");
          break;

        case "OauthCreateAccount":
          toast.error("This username is already taken");
          break;

        case "Callback":
          toast.error("Oh no...Something went wrong. Please try again");
          break;

        default:
          toast.error("Oh no...Something went wrong. Please try again");
          break;
      }

      const timer = setTimeout(() => {
        router.replace("/sign-in");
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }

    if (session.status === "authenticated" && showLoggedInfo) {
      toast.success("You've been signed in successfully!");
    }
  }, [params, router, session, showLoggedInfo]);
};
