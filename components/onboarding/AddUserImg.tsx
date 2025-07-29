"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import Image from "next/image";
import { Check, Trash, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { imageSchema, ImageSchema } from "@/schemas/ImageSchema";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import { User as UserType } from "@prisma/client";
import axios from "axios";
import { LoadingState } from "../ui/loadingState";

interface Props {
  profileImage: string | null | undefined;
  className?: string;
}

export const AddUserImage = ({ profileImage, className }: Props) => {
  const form = useForm<ImageSchema>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      image: profileImage,
    },
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<null | HTMLInputElement>(null);
  const photoRef = useRef<null | HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const queryClient = useQueryClient();

  const onImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        const result = imageSchema.safeParse({ image: selectedFile });

        if (result.success) {
          form.clearErrors("image");
          form.setValue("image", selectedFile);
          setImagePreview(URL.createObjectURL(selectedFile));
        } else {
          const errors = result.error.flatten().fieldErrors.image;
          errors?.forEach((error) =>
            form.setError("image", { message: error })
          );
        }
      }
    },
    [form]
  );

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onUploadError: () => {
      toast.error("Failed to update your profile image. Please try again");
    },
    onClientUploadComplete: (data) => {
      if (data) uploadProfileImage(data[0].ufsUrl);
      else toast.error("Failed to update your profile image. Please try again");
    },
  });

  const { mutate: uploadProfileImage, isPending } = useMutation({
    mutationFn: async (newProfileImage: string) => {
      const { data } = await axios.post(`/api/profile/profileImage`, {
        profileImage: newProfileImage,
      });
      return data as UserType;
    },
    onMutate: async (newProfileImage: string) => {
      await queryClient.cancelQueries({ queryKey: ["userProfile"] });

      const previousProfile = queryClient.getQueryData<UserType>([
        "userProfile",
      ]);

      queryClient.setQueryData<UserType>(["userProfile"], (old) => {
        if (!old) return old;
        return { ...old, image: newProfileImage };
      });

      return { previousProfile };
    },
    onError: (error, newProfileImage, context) => {
      queryClient.setQueryData(["userProfile"], context?.previousProfile);
      toast.error("Failed to update the profile Image. Please try again.");
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast.success("Profile Image successfully updated");
      setOpen(false);
      await update();
      router.refresh();
    },
    mutationKey: ["updateProfileImage"],
  });

  const { mutate: deleteProfileImage, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/profile/delete_prof_img");
      return data as UserType;
    },
    onError: () => {
      toast.error("Failed to delete the profile image. Please try again");
    },

    onSuccess: () => {
      toast.success("Your profile image has been deleted successfully");
    },
    mutationKey: ["deleteProfileImage"],
  });

  const onSubmit = useCallback(
    async (data: ImageSchema) => {
      const image: File = data.image;
      await startUpload([image]);
    },
    [startUpload]
  );

  const imageOptions = useMemo(() => {
    if (!imagePreview && profileImage) {
      return {
        canDelete: true,
        canSave: false,
      };
    } else if (imagePreview && !profileImage) {
      return {
        canDelete: false,
        canSave: true,
      };
    } else if (imagePreview && profileImage) {
      return {
        canDelete: true,
        canSave: true,
      };
    } else {
      return {
        canDelete: false,
        canSave: false,
      };
    }
  }, [profileImage, imagePreview]);

  return (
    <div>
      <p
        onClick={() => {
          photoRef.current?.click();
        }}
        className="text-muted-foreground text-sm cursor-pointer my-2"
      >
        Add Your Photo
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            ref={photoRef}
            className={cn(
              "group relative bg-muted w-16 h-16 md:h-20 md:w-20 rounded-full flex justify-center items-center text-muted-foreground overflow-hidden",
              className
            )}
          >
            {profileImage ? (
              <Image
                priority
                src={profileImage}
                alt="PI"
                fill
                className="object-cover w-full h-full size-full"
              />
            ) : (
              <User />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex flex-col items-center">
          <DialogHeader className="items-center justify-center">
            <DialogTitle className="py-2">Upload a photo</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Add a new Photo to your account. You can always change it later.
          </DialogDescription>
          {imagePreview ? (
            <div className="rounded-full w-52 h-52 relative overflow-hidden my-5">
              <Image
                alt="pfp"
                src={imagePreview}
                fill
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <Avatar className="size-24">
              {/* @ts-expect-error: wtv */}
              <AvatarImage className="object-cover" src={profileImage} />
              <AvatarFallback>
                <User size={18} />
              </AvatarFallback>
            </Avatar>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-center items-center">
                        <Button
                          onClick={() => {
                            inputRef.current?.click();
                          }}
                          type="button"
                          className="dark:text-white mb-1"
                        >
                          Choose an Image
                        </Button>

                        <Input
                          {...field}
                          ref={inputRef}
                          value={undefined}
                          onChange={onImageChange}
                          type="file"
                          id="image"
                          className="hidden"
                          accept="image/*"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex mt-5 w-full justify-center items-center gap-4">
                <Button
                  type="button"
                  className="rounded-full w-12 h-12 p-2"
                  disabled={
                    !imageOptions.canDelete || isDeleting || isUploading
                  }
                  variant={imageOptions.canDelete ? "delete" : "secondary"}
                  onClick={() => {
                    deleteProfileImage();
                  }}
                >
                  {isDeleting || isUploading ? (
                    <LoadingState />
                  ) : (
                    <Trash size={18} />
                  )}
                </Button>
                <Button
                  type="submit"
                  className="rounded-full w-12 h-12 p-2"
                  disabled={!imageOptions.canSave || isPending || isUploading}
                  variant={imageOptions.canSave ? "save" : "secondary"}
                >
                  {isPending || isUploading ? (
                    <LoadingState />
                  ) : (
                    <Check size={18} />
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
