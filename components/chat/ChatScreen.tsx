import Image from "next/image";


interface Props {
  content: string;
  createdAt: string;
  userName: string;
  userImage: string;
  own: boolean,
  onReply: () => void,
  replyTo?: { senderName: string; content: string };
}

export const ChatScreen = ({
  content,
  createdAt,
  userName,
  userImage,
  own,
  onReply,
  replyTo
  
}: Props) => {
  return (
    <div className={`flex items-start ${own && "justify-end"} p-2`}>
      <div className="flex items-center justify-center rounded-full mr-2">
        {!own && <Image
          className="rounded-full justify-center items-center size-auto"
          width={45}
          height={45}
          src={userImage}
          alt="pfp"
        />}
      </div>
      <div className="max-w-[70%] rounded-2xl bg-white/20 backdrop-blur-md p-2 text-white shadow-md min-w-[12%]">
        {/* 1. Show the name only on incoming messages */}
        {!own && (
          <p className="text-xs font-bold bg-gradient-to-r from-blue-700 to-red-500 text-transparent bg-clip-text mb-1">
            {userName}
          </p>
        )}

        {/* 2. If this message is a reply, show the quoted snippet */}
        {replyTo && (
          <div className="border-l-2 border-gray-300 pl-2 mb-1 text-xs text-gray-200 italic">
            <strong>{replyTo.senderName}</strong>: {replyTo.content}
          </div>
        )}
          {/* 3. The actual message */}
        <p className="text-sm mb-1">{content}</p>

        {/* 4. Footer with time and a Reply button */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{createdAt}</span>
          <button onClick={onReply} className="opacity-50 hover:opacity-100">
            Reply
          </button>
      </div>
      </div>
    </div>
  );
};
