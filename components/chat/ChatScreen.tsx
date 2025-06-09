import Image from "next/image";


interface Props {
  content: string;
  createdAt: string;
  userName: string;
  userImage: string;
  own: boolean,
}

export const ChatScreen = ({
  content,
  createdAt,
  userName,
  userImage,
  own
}: Props) => {
    
  return (
    <div className={`flex items-start ${own && "justify-end"} p-2`}>
      <div className="flex items-center justify-center rounded-full mr-2">
        {!own && <Image
          className="rounded-full justify-center items-center"
          width={45}
          height={45}
          src={userImage}
          alt="pfp"
        />}
      </div>
      <div className="max-w-[70%] rounded-2xl bg-white/20 backdrop-blur-md p-2 text-white shadow-md min-w-[12%]">
      <p className="text-xs font-bold bg-gradient-to-r from-blue-700 to-red-500 text-transparent bg-clip-text mb-1">user name</p>
        <p className="text-sm mb-1">{content}</p>
        <p className="flex text-xs text-muted-foreground justify-end">{createdAt}</p>
      </div>
    </div>
  );
};
