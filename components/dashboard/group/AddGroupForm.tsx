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

interface Props {
    onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }

export const AddGroupForm = ({onSetOpen}: Props) => {
  const [uploadError, setUploadError] = useState(false);

  const form = useForm<GroupSchema>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      groupName: "",
    },
  });

  const { mutate: newGroup, isPending } = useMutation({
    mutationFn: async (data: ApiGroupSchema) => {
      const { data: result } = await axios.post("/api/group/new", data);
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
      toast.success("Your group has been created successfully!");
    },
    mutationKey: ["newGroup"],
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

    newGroup({
      groupName: data.groupName,
      file: groupImageURL,
    });
  };

  return (
    <div>
        <Uploadfile form={form} onSubmit={onSubmit} schema={groupSchema} isUploading={isUploading} isPending={isPending} />
      
    </div>
  );
}
