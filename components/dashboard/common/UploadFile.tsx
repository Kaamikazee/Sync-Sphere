/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
import { LoadingState } from "@/components/ui/loadingState";
import { cn } from "@/lib/utils";
import { ArrowRight, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

interface Props<> {
  form: UseFormReturn<any>;
  onSubmit?: any;
  schema: z.ZodObject<any>;
  getImagePreview?: React.Dispatch<React.SetStateAction<string>>;
  hideFileName?: boolean;
  isUploading?: boolean;
  isPending?: boolean;
  hideBtn?: boolean;
  previewUrlUpdate?: string | null;
  isUpdate?: boolean;
}

export function Uploadfile({
  form,
  onSubmit,
  schema,
  getImagePreview,
  hideFileName,
  isPending,
  isUploading,
  hideBtn,
  previewUrlUpdate,
  isUpdate = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(previewUrlUpdate || null);

  const onFileHandler = (providedFile: File) => {
    const result = schema
      .pick({ file: true })
      .safeParse({ file: providedFile }) as z.SafeParseReturnType<
      {
        [x: string]: any;
      },
      {
        [x: string]: any;
      }
    >;

    if (result.success) {
      form.clearErrors("file");
      form.setValue("file", providedFile);
      setFile(providedFile);
      const objectUrl = URL.createObjectURL(providedFile);
      setPreviewUrl(objectUrl);
      if (getImagePreview) getImagePreview(objectUrl);
    } else {
      const errors = result.error.flatten().fieldErrors.file;
      errors?.forEach((error) => form.setError("file", { message: error }));
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files[0]) {
      onFileHandler(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      onFileHandler(files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const removeFile = () => {
    setFile(null);
    form.setValue("file", null);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50">
                    Group Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-muted w-full"
                      placeholder="eg. OpenStudio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-muted w-full"
                      placeholder="Add description about group"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/50 mb-1.5 self-start">
                  Group Icon
                </FormLabel>
                <FormControl>
                  <div
                    className={cn(
                      `${
                        dragActive ? "bg-primary/20" : "bg-muted"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-4 sm:p-6 cursor-pointer hover:bg-muted/90 duration-200 transition-colors ring-offset-background rounded-md relative border border-gray-text-white/50 text-white/50 flex flex-col justify-center items-center w-[15rem]`,
                      "w-full"
                    )}
                    onDragEnter={handleDragEnter}
                    onDrop={handleDrop}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef?.current.click();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (inputRef.current && e.key === "Enter") {
                        inputRef?.current.click();
                      }
                    }}
                    role="presentation"
                    tabIndex={0}
                  >
                    <Input
                      placeholder="file Input"
                      className="sr-only"
                      type="file"
                      multiple={true}
                      {...field}
                      ref={inputRef}
                      value={undefined}
                      onChange={handleChange}
                      accept="image/*"
                    />

                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-full border border-white/30"
                        height={200}
                        width={200}
                      />
                    ) : (
                      <>
                        <UploadCloud size={30} />
                        <p className="text-sm font-semibold uppercase text-primary mt-5">
                          Upload
                        </p>
                        <p className="text-xs mt-1 text-center">
                          Only .jpeg, .jpg, .png, .webp, .gif types are
                          supported
                        </p>
                      </>
                    )}
                    {previewUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 text-destructive bg-white/30 hover:bg-white/50 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                          setPreviewUrl(null);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                {file && !hideFileName && (
                  <div className="flex items-center flex-row space-x-5 text-sm mt-4">
                    <p>{file.name}</p>
                    <Button
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFile()}
                      variant={"ghost"}
                      size={"icon"}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                )}
              </FormItem>
            )}
          />
          {/* Switch for isPrivate */}
          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-4">
                <FormLabel className="text-white/50 mb-1.5 self-start">
                  Private Group
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("isPrivate") && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/50">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="bg-muted w-full"
                      placeholder="Enter password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {!hideBtn && (
            <Button
              disabled={!form.formState.isValid || isUploading}
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              className="w-full mt-10 max-w-md dark:text-white font-semibold mb-3"
            >
              {isUploading || isPending ? (
                <LoadingState loadingText={"Creating. Please Wait"} />
              ) : (
                <>
                  {isUpdate ? "Update" : "Create"}
                  <ArrowRight className="ml-2" width={18} height={18} />
                </>
              )}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
