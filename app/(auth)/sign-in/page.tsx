import { AuthCard } from "@/components/auth/AuthCard";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Sign In - SyncSphere",
    description: "SyncSphere - Sign In Page",
}
const signIn = () => {
    return (
        <div>
             <Suspense fallback={<div>Loading...</div>}>
                    <AuthCard signInCard/>
                  </Suspense>
        </div>
    )
}

export default signIn;