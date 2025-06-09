import { AuthCard } from "@/components/auth/AuthCard";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In - test-app",
    description: "test-app - Sign In Page",
}
const signIn = () => {
    return (
        <div>
            <AuthCard signInCard/>
        </div>
    )
}

export default signIn;