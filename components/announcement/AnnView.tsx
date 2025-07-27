"use client";

import { Separator } from "../ui/separator";
import Image from "next/image";
import { useState } from "react";
import { Announcement, UserPermission } from "@prisma/client";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Highlight from "@tiptap/extension-highlight";
import Selection from "../tiptap-extension/selection-extension";
import { EditorContent } from "@tiptap/react";
import { ImageUploadNode } from "../tiptap-node/image-upload-node";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import TrailingNode from "../tiptap-extension/trailing-node-extension";
import Link from "@tiptap/extension-link";
import { EditAnnouncement } from "./EditAnnouncement";

interface Props {
  // totals: UserTotal[];
  announcement: Announcement;
  userRole: UserPermission
  isOpen: boolean;
  onClose: () => void;
}

export const AnnView = ({ announcement, userRole }: Props) => {
  const [open, setOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,

      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      TrailingNode,
      Link.configure({ openOnClick: false }),
    ],
    content: announcement.content,
    editable: false,
    injectCSS: false,
  });

  console.log("wHAT IS GETTING BACK: ", announcement);

  return (
    <div className="fixed inset-0 flex items-start sm:items-center justify-center overflow-auto p-6 bg-gradient-to-br from-purple-600/40 via-blue-500/40 to-indigo-600/40 backdrop-blur-xl">
  {/* Panel Container */}
  <div
    className={`
      w-[90vw] h-[auto] max-h-[90vh]
      bg-white/5 backdrop-blur-md
      border border-white/30 shadow-xl rounded-2xl
      p-6 space-y-6
      transition-transform duration-300
      hover:shadow-2xl hover:scale-105
      overflow-y-auto
    `}
  >
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-sm">
        {announcement.title}
      </h2>
      {/* edit button removed from here */}
    </div>

    {/* Timestamp */}
    <p className="text-white text-xs sm:text-sm">
      {new Date(announcement.createdAt).toLocaleString()}
    </p>

    {/* Content */}
    <div className="bg-white/40 backdrop-blur-sm border border-white/20 rounded-xl shadow-inner p-4 text-black prose">
      {editor ? <EditorContent editor={editor} /> : <p>Loading content…</p>}
    </div>

    <Separator className="border-white/40" />

    {/* Action Footer */}
    <div className="flex flex-wrap items-center gap-6">
      <button className="text-black hover:text-black/90 transition hover:drop-shadow-md cursor-pointer hover:scale-110">
        👍 Like
      </button>
      <button className="text-white hover:text-white/90 transition hover:drop-shadow-md cursor-pointer hover:scale-110">
        💬 Comment
      </button>
      <button className="text-white hover:text-white/90 transition hover:drop-shadow-md cursor-pointer hover:scale-110">
        👁️ Views
      </button>
    </div>
  </div>

  {/* Sticky Edit Button (only for ADMIN/OWNER) */}
  {(userRole === "ADMIN" || userRole === "OWNER") && (
    <div className="fixed bottom-6 right-6">
      <EditAnnouncement
        annId={announcement.id}
        content={announcement.content}
        title={announcement.title}
      />
    </div>
  )}
</div>

  );
};
