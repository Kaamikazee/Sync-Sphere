"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  groupId: string;
}

export const DeleteGroup = ({ groupId }: Props) => {
    const router = useRouter();
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      groupId,
    }: {
      groupId: string;
    }) => {
      await axios.post("/api/group/delete", {
        groupId,
      });
    },
    onSuccess: () => {
        toast.success("You have left the group successfully");
        router.refresh();
    },
    mutationKey: ["deleteGroup"],
  });
  return (
    <button
      className="px-6 py-2 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-700 hover:bg-gradient-to-r hover:from-gray-300 hover:via-gray-400 hover:to-gray-600 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
      disabled={isPending}
      onClick={() => mutate({ groupId })}
    >
      Delete Group
    </button>
  );
};
