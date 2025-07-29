import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - SyncSphere",
  description: "SyncSphere - Sign Up Page",
};

const signUp = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCard />
      </Suspense>
    </div>
  );
};

export default signUp;
