/*
VirtualizedChatList.tsx

Usage notes (top-level):
1) Install: `npm install react-virtuoso` (or yarn/pnpm)
2) Place this file under `src/components/VirtualizedChatList.tsx` (or wherever you prefer)
3) Import in ChatContainer: `import VirtualizedChatList, { VirtualizedHandle } from '@/components/VirtualizedChatList'`
4) Replace your `CardContent` messages area with this component. It exposes an imperative ref with methods: `scrollToBottom()`, `scrollToMessage(messageId)`, and `getIndexOfMessage(messageId)`.

Design decisions:
- Uses react-virtuoso for variable-height messages.
- `renderMessage` now receives `(msg, index, userId)` so you can easily pass `userId` down to `ChatMessage` without capturing it via closure.
- `estimatedItemHeight` (optional) is wired to `defaultItemHeight` to give Virtuoso a helpful hint when message heights are fairly consistent.
- `registerRef` still works to maintain DOM refs for message highlighting / focusing.
*/

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import type { MessageWithSenderInfo } from "@/types/extended";

export type VirtualizedHandle = {
  scrollToBottom: (opts?: { behavior?: "auto" | "smooth" }) => void;
  scrollToMessage: (
    messageId: string,
    opts?: { behavior?: "auto" | "smooth" }
  ) => void;
  getIndexOfMessage: (messageId: string) => number | null;
};

type Props = {
  messages: MessageWithSenderInfo[];
  userId?: string;
  // renderMessage receives the message, its index and the userId (optional)
  renderMessage: (
    msg: MessageWithSenderInfo,
    index: number,
    userId?: string
  ) => React.ReactNode;
  // called when user scrolls to top (older messages)
  onLoadMore?: () => void;
  // whether to auto-follow latest messages (same idea as isAutoScroll)
  followOutput?: boolean;
  // registerRef allows parent to maintain message refs (for jump/highlight)
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
  // optional estimated height (helps initial virtualization); leave undefined to let virtuoso measure
  estimatedItemHeight?: number;
};

const VirtualizedChatList = forwardRef<VirtualizedHandle, Props>(
  (
    {
      messages,
      userId,
      renderMessage,
      onLoadMore,
      followOutput = true,
      registerRef,
      estimatedItemHeight,
    },
    ref
  ) => {
    const virtuosoRef = useRef<VirtuosoHandle | null>(null);

    // map from messageId -> index for quick lookups
    const idToIndex = useMemo(() => {
      const map = new Map<string, number>();
      for (let i = 0; i < messages.length; i++) map.set(messages[i].id, i);
      return map;
    }, [messages]);

    useImperativeHandle(
      ref,
      (): VirtualizedHandle => ({
        scrollToBottom: (opts = { behavior: "smooth" }) => {
          const last = messages.length - 1;
          if (last >= 0)
            virtuosoRef.current?.scrollToIndex({
              index: last,
              behavior: opts.behavior,
            });
        },
        scrollToMessage: (messageId: string, opts = { behavior: "smooth" }) => {
          const idx = idToIndex.get(messageId);
          if (typeof idx === "number")
            virtuosoRef.current?.scrollToIndex({
              index: idx,
              behavior: opts.behavior,
            });
        },
        getIndexOfMessage: (messageId: string) => {
          const idx = idToIndex.get(messageId);
          return typeof idx === "number" ? idx : null;
        },
      }),
      [messages, idToIndex]
    );

    const itemContent = useCallback(
      (index: number) => {
        const msg = messages[index];
        if (!msg) return null;
        return (
          <div
            data-message-id={msg.id}
            data-user-id={userId}
            ref={(el) => registerRef?.(msg.id, el)}
            style={{ width: "100%" }}
          >
            {renderMessage(msg, index, userId)}
          </div>
        );
      },
      [messages, renderMessage, registerRef, userId]
    );

    return (
      <Virtuoso
        ref={(inst) => {
          virtuosoRef.current = inst;
        }}
        data={messages}
        totalCount={messages.length}
        itemContent={(index) => itemContent(index)}
        style={{ height: "100%", width: "100%" }}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput={followOutput ? "auto" : "smooth"}
        atTopStateChange={(atTop) => {
          if (atTop && onLoadMore) onLoadMore();
        }}
        increaseViewportBy={{ top: 400, bottom: 200 }}
        computeItemKey={(index) => messages[index]?.id ?? index}
        defaultItemHeight={estimatedItemHeight}
      />
    );
  }
);

VirtualizedChatList.displayName = "VirtualizedChatList";

export default VirtualizedChatList;