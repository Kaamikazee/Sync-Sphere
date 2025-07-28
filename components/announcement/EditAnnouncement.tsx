"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SimpleEditor,
  SimpleEditorHandle,
} from "../tiptap-templates/simple/simple-editor";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { JsonValue } from "next-auth/adapters";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

interface Props {
  annId: string;
  content: JsonValue;
  title: string;
}

export function EditAnnouncement({ annId, content, title: annTitle }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(annTitle);
  const router = useRouter();
  const editorRef = useRef<SimpleEditorHandle>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const editor = editorRef.current?.editor;
      if (!editor) return;
      const tiptapJSON = editor.getJSON();
      const { data } = await axios.post(
        `/api/announcement/edit?announcementId=${annId}`,
        { title, content: tiptapJSON }
      );
      return data;
    },
    onSuccess: () => {
      router.refresh();
      toast.success("Announcement updated successfully");
    },
    onError: (err: AxiosError) => {
      toast.error(err.message);
    },
  });

  return (
    <>
      {/* Trigger Button */}
      <HoverCard>
        <HoverCardTrigger>
             <Button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-colors rounded-full text-3xl size-15 cursor-pointer"
          >
            📝
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white hover:from-indigo-600 hover:to-purple-600 transition-colors mb-6 w-50 border-0 mr-2 ">
         Edit Announcement
        </HoverCardContent>
      </HoverCard>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 0.68, 0.43, 0.99] }}
              className="fixed inset-5 z-50 flex flex-col bg-white border border-gray-200 rounded-t-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex flex-col">
                  <Label>Edit Title</Label>
                  <Input
                    defaultValue={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-600 mt-1">
                    Let your team know what changed
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                  disabled={isPending}
                    onClick={() => {
                      mutate();
                      setIsOpen(false);
                    }}
                    className="bg-gradient-to-r from-indigo-400 to-purple-500 text-white hover:from-indigo-500 hover:to-purple-600 shadow-md transition-colors"
                  >
                    Update
                  </Button>
                </div>
              </div>

              <Separator className="border-gray-200" />

              {/* Editor Content */}
              <div className="flex-1 px-6 py-4 overflow-y-auto text-black prose">
                <SimpleEditor ref={editorRef} initialContent={content as JsonValue} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
