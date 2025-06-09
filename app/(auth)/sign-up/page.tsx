import { AuthCard } from "@/components/auth/AuthCard";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign Up - test-app",
    description: "test-app - Sign Up Page",
}
const signUp = () => {
    return (
        <div>
            <AuthCard />
        </div>
    )
}

export default signUp;