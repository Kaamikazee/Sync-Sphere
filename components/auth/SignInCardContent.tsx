"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "../ui/separator";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signIn } from "next-auth/react";
import { signInSchema } from "@/schemas/signInSchema";
import ProviderSignInBtns from "./ProvSignBtns";

const formSchema = signInSchema;

export const SignInCardContent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const account = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!account) {
        throw new Error("Wrong details");
      } else if (account.error) {
        toast.error(account.error);
      } else {
        toast.success("You are successfully logged in");
      }

      router.push("/");
    } catch (err) {
      let errMsg = "Something Went Wrong";

      if (typeof err === "string") {
        errMsg = err;
      } else if (err instanceof Error) {
        errMsg = err.message;
      }

      toast.error(errMsg);
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <ProviderSignInBtns signInCard onLoading={setIsLoading} disabled={isLoading}/>
      <Separator className="mt-4 mb-3 rounded-full" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={isLoading} className="w-full mt-1" type="submit">
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
};
