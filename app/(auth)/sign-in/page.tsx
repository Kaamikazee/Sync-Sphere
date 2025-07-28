import { AuthCard } from "@/components/auth/AuthCard";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Sign In - test-app",
    description: "test-app - Sign In Page",
}
const signIn = () => {
    return (
        <div>
             <Suspense fallback={<div>Loading...</div>}>
                    <AuthCard />
                  </Suspense>
        </div>
    )
}

export default signIn;