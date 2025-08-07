"use client"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { SignUpCardContent } from "./SignUpCardContent";
import Link from "next/link";
import { SignInCardContent } from "./SignInCardContent";

interface Props {
  signInCard?: boolean;
}

export const AuthCard = ({ signInCard }: Props) => {
  return (
    <Card className="w-full sm:min-w-[28rem] sm:w-auto">
      <CardHeader className="flex justify-center items-center flex-col">
        <div className="w-12 h-12 rounded-full overflow-hidden self-center">
          <Image
            src="https://images.unsplash.com/photo-1737048850806-5cd8bc9fadda?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt=""
            height={50}
            width={50}
            className="object-cover"
          />
        </div>
        <CardTitle className="text-4xl">
          {signInCard ? "🔐Signin" : `🔐Signup`}
        </CardTitle>
        <CardDescription>
          {signInCard ? "Welcome back to the Sync Sphere" : `Welcome to the Sync Sphere`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>{signInCard ? <SignInCardContent /> : <SignUpCardContent />}</p>
      </CardContent>
      <CardFooter></CardFooter>
      <p className="text-sm text-center mt-2">
        {signInCard? "Don't have an account?" : "Already have an account?"}{" "}
        <Link className="text-blue-900 hover:underline" href={signInCard ? "/sign-up" :`/sign-in`}>
          {signInCard ? "Sign Up" : "Sign in"}
        </Link>
      </p>
    </Card>
  );
};
