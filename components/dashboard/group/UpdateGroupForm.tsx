"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  groupSchema,
} from "@/schemas/groupSchema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { Uploadfile } from "../common/UploadFile";
import { Group } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  ApiUpdateGroupSchema,
  updateGroupSchema,
  UpdateGroupSchema,
} from "@/schemas/updateGroupSchema";

interface Props {
  onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  groupId: string | undefined;
  group?: Group; // Optional group prop for updating
}

export const UpdateGroupForm = ({ onSetOpen, groupId, group }: Props) => {
  const [uploadError, setUploadError] = useState(false);
  const router = useRouter();

  const form = useForm<UpdateGroupSchema>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      groupName: group?.name || "",
      description: group?.description || "",
      isPrivate: group?.isPrivate || false,
      password: "",
    },
    mode: "onChange", // or "onChange"
  });

  const { mutate: updateGroup, isPending } = useMutation({
    mutationFn: async (data: ApiUpdateGroupSchema) => {
      const { data: result } = await axios.post("/api/group/update", {
        data,
        groupId,
      });
      return result;
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: () => {
      onSetOpen(false);
      form.reset();
      toast.success("Your group has been updated successfully!");
      router.refresh();
    },
    mutationKey: ["updateGroup"],
  });

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onUploadError: () => {
      setUploadError(true);
      toast.error("Failed to add group icon. Please try again");
    },
    onClientUploadComplete: (data) => {
      if (!data) {
        setUploadError(true);
        toast.error("Failed to add group icon. Please try again");
      }
    },
  });

  const onSubmit = async (data: UpdateGroupSchema) => {
  setUploadError(false);

  const image: File | undefined | null = data.file; // undefined = untouched, null = removed, File = new
  let groupImageURL: string | null = null;

  // upload only when a new File was provided
  if (image instanceof File) {
    const uploaded = await startUpload([image]);
    if (uploaded) groupImageURL = uploaded[0].ufsUrl;
  }

  if (uploadError) return;

  // build payload and only include 'file' when necessary
  const payload: UpdateGroupSchema = {
    groupName: data.groupName,
    description: data.description,
    isPrivate: data.isPrivate,
    password: data.password,
  };

  if (image instanceof File) {
    // new file uploaded => send new URL
    payload.file = groupImageURL;
  } else if (form.getValues("file") === null) {
    // user explicitly removed the file => send null to delete on backend
    payload.file = null;
  }
  // else: file was untouched (undefined) => don't set payload.file so backend keeps existing image

  updateGroup(payload);
};


  // If using .transform or .refine, extract the base object schema:
  const baseGroupSchema = groupSchema._def.schema; // For .transform/.refine

  return (
    <div>
      <Uploadfile
        isUpdate
        form={form}
        onSubmit={onSubmit}
        schema={baseGroupSchema}
        isUploading={isUploading}
        isPending={isPending}
        previewUrlUpdate={group?.image || null}
      />
    </div>
  );
};
