"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  ApiGroupSchema,
  groupSchema,
  GroupSchema,
} from "@/schemas/groupSchema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { Uploadfile } from "../common/UploadFile";
import { Group } from "@prisma/client";

interface Props {
    onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
    groupId: string | undefined;
    group?: Group; // Optional group prop for updating
  }

export const UpdateGroupForm = ({onSetOpen, groupId, group}: Props) => {
  const [uploadError, setUploadError] = useState(false);

  const form = useForm<GroupSchema>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      groupName: group?.name || "",
      description: group?.description || "",
      isPrivate: group?.isPrivate || false,
      password: "",
    },
  });

  const { mutate: updateGroup, isPending } = useMutation({
    mutationFn: async (data: ApiGroupSchema) => {
      const { data: result } = await axios.post("/api/group/update", {data, groupId});
      return result;
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: () => {
        onSetOpen(false)
      toast.success("Your group has been updated successfully!");
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

  const onSubmit = async (data: GroupSchema) => {
    setUploadError(false);

    const image: File | undefined | null = data.file;

    let groupImageURL: null | string = null;
    if (image) {
      const data = await startUpload([image]);
      if (data) groupImageURL = data[0].ufsUrl;
    }
    if (uploadError) return;

    updateGroup({
      groupName: data.groupName,
      file: groupImageURL,
      description: data.description,
      isPrivate: data.isPrivate,
      password: data.password,
    });
  };

  // If using .transform or .refine, extract the base object schema:
const baseGroupSchema = groupSchema._def.schema; // For .transform/.refine

  return (
    <div>
        <Uploadfile isUpdate form={form} onSubmit={onSubmit} schema={baseGroupSchema} isUploading={isUploading} isPending={isPending} previewUrlUpdate={group?.image || null}/>
    </div>
  );
}
