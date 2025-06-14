import { Announcement, UserPermission } from "@prisma/client";
import Link from "next/link";
import { CreateAnnouncement } from "./CreateAnnouncement";

interface Props {
  announcements: Announcement[];
  groupId: string;
  userRole: UserPermission;
}

export function AnnouncementContainer({
  announcements,
  groupId,
  userRole,
}: Props) {
  const canCreate = userRole === "ADMIN" || userRole === "OWNER";

  return (
    <div
      className="p-6 bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl space-y-6 transition-shadow duration-300 hover:shadow-2xl"
    >
      <h2 className="text-3xl font-extrabold text-white text-center">
        Announcements
      </h2>

      {announcements.length > 0 ? (
        <ul className="divide-y divide-white/30 rounded-2xl overflow-hidden shadow-inner bg-white/10 backdrop-blur-md border border-white/20">
          {announcements.map((a) => (
            <Link key={a.id} href={`announcement/${a.id}`}> 
              <li className="flex items-center justify-between p-4 transition-colors hover:bg-white/10 text-white">
                <span className="font-medium hover:underline">{a.title}</span>
                <span className="text-sm font-mono text-white/80">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </li>
            </Link>
          ))}
        </ul>
      ) : (
        <div className="text-white text-center text-lg">
          No announcements made yet.
        </div>
      )}

      {canCreate && (
        <div className="flex justify-center">
          {/* Use the modal-trigger component directly to avoid nested buttons */}
          <CreateAnnouncement groupId={groupId} />
        </div>
      )}
    </div>
  );
}
