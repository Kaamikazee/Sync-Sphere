"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Session } from "next-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError, AxiosResponse } from "axios";
import { useSession } from "next-auth/react";
import { LoadingState } from "@/components/ui/loadingState";
import { useRouter } from "next/navigation";
import { AddUserImage } from "../onboarding/AddUserImg";
import { toast } from "sonner";
import { accountInfoSettingsSchema, AccountInfoSettingsSchema } from "@/schemas/accountInfoSettingsSchema";

interface Props {
  session: Session;
}


export const AccountInfo = ({
  session: {
    user: { image, name, surname, username},
  },
}: Props) => {
  const { update } = useSession();
  const router = useRouter();
  const form = useForm<AccountInfoSettingsSchema>({
    resolver: zodResolver(accountInfoSettingsSchema),
    defaultValues: {
      username: username!,
      name: name ? name : "",
      surname: surname ? surname : "",
    },
  });

  const { mutate: editProfile, isPending } = useMutation({
    mutationFn: async (updatedData: AccountInfoSettingsSchema) => {
      const { data } = (await axios.post(
        "/api/profile/edit",
        updatedData
      )) as AxiosResponse<AccountInfoSettingsSchema>;

      return data;
    },
    onError: (err: AxiosError) => {

      toast.error(
        typeof err === "string" ? err : err.message || "An error occurred")
    },
    onSuccess: async () => {
      await update();
      router.refresh();
    },
    mutationKey: ["profileEdit"],
  });

  const onSubmit = (data: AccountInfoSettingsSchema) => {
    editProfile(data);
  };

  return (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-300 p-4">
    <Card className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 md:p-8 space-y-6 transition-all duration-300 hover:shadow-2xl">
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <p className="uppercase text-xs text-gray-700 tracking-wide">
            Account Image
          </p>
          <AddUserImage
            className="w-24 h-24 md:w-28 md:h-28 ring-2 ring-white/30 rounded-full shadow-md"
            profileImage={image}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase text-gray-700">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white/20 text-gray-900 placeholder-gray-500 focus:bg-white/30 backdrop-blur-sm border-none rounded-xl"
                        placeholder="Enter your username"
                        {...field}
                      />
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
                    <FormLabel className="text-xs uppercase text-gray-700">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white/20 text-gray-900 placeholder-gray-500 focus:bg-white/30 backdrop-blur-sm border-none rounded-xl"
                        placeholder="Enter your first name"
                        {...field}
                      />
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
                    <FormLabel className="text-xs uppercase text-gray-700">
                      Surname
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white/20 text-gray-900 placeholder-gray-500 focus:bg-white/30 backdrop-blur-sm border-none rounded-xl"
                        placeholder="Enter your surname"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional: Bio and Joined info */}
            <div className="space-y-4 mt-6 text-gray-900">
              <div>
                <p className="text-sm font-semibold">Bio</p>
                <p className="text-sm text-gray-600 italic">
                  I love building with Next.js and Prisma. {/* from db later */}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Joined On</p>
                <p className="text-sm text-gray-600">
                  July 1st, 2024 {/* fetch this later */}
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <Button
                disabled={isPending}
                className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-md px-6 py-2 rounded-full"
                type="submit"
              >
                {isPending ? <LoadingState loadingText="Updating…" /> : "Update"}
              </Button>

              <Button
                variant="ghost"
                className="text-gray-700 hover:text-gray-900 hover:underline"
              >
                Change Password
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  </div>
);

};
