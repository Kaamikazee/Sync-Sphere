"use client";
import { useOnboardingForm } from "@/context/OnboardingForm";
import { firstStepSchema, FirstStepSchema } from "@/schemas/FirstStep";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { ArrowRight } from "lucide-react";
import { ActionType } from "@/types/onboardingContext";
import { useEffect } from "react";
import { AddUserImage } from "./AddUserImg";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  profileImage: string | null | undefined;
}

export function FirstStep({ profileImage }: Props) {
  const { username, name, surname, dispatch } = useOnboardingForm();
  const { update } = useSession();
  const router = useRouter();

  const form = useForm<FirstStepSchema>({
    resolver: zodResolver(firstStepSchema),
    defaultValues: {
      username: username ? username : "",
      name: name ? name : "",
      surname: surname ? surname : "",
    },
  });

  useEffect(() => {
    dispatch({
      type: ActionType.PROFILEIMAGE,
      payload: profileImage as string | null | undefined,
    });
  }, [profileImage, dispatch]);

  function onSubmit(data: FirstStepSchema) {
    dispatch({
      type: ActionType.USERNAME,
      payload: data.username,
    });
    dispatch({
      type: ActionType.NAME,
      payload: data.name,
    });
    dispatch({
      type: ActionType.SURNAME,
      payload: data.surname,
    });

    completeOnboarding()
  }

  const { mutate: completeOnboarding, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("api/onboarding", {
        username,
        name,
        surname,
      });
      return data;
    },
    
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS_DEFAULT";

      toast.error(error);
    },
    onSuccess: async () => {
      toast.success("Welcome to test-app");
      await update();
      router.push("/dashboard");
      router.refresh();
    },
    mutationKey: ["completeOnboarding"]
  });

  return (
    <>
      <h2 className="font-bold text-4xl md:text-5xl flex flex-col items-center my-5">
        <span className="font-bold text-4xl md:text-5xl flex flex-col items-center my-5">{`Let's get you ready`}</span>
      </h2>
      <div className="flex w-full flex-col items-center">
        <div className="flex flex-col justify-center items-center gap-2">
          <AddUserImage profileImage={profileImage} />
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-md w-full"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    First Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="surname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Surname
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Surname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="w-full">
              <Button type="submit"
              disabled={isPending}
              className="w-full">
                Next{" "}
                <ArrowRight
                  className="w-full max-w-md font-semibold"
                  size={18}
                />
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
