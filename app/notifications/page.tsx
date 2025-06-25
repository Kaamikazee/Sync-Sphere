import { getAllNotifications } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const Notifications = async () => {
  // Fetch notifications from the API
  const session = await checkIfUserCompleteOnboarding(
    "/dashboard/notifications"
  );
  const userId = session?.user.id;
  if (!userId) {
    return <div>Please log in to view notifications.</div>;
  }
  const notifications = await getAllNotifications(userId);
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md border border-white/20 shadow-lg flex justify-center hover:shadow-2xl hover:scale-105 transition-transform duration-300">
      <div className="w-full max-w-3xl space-y-4">
        <h2 className="text-3xl font-extrabold text-white mb-2 text-center">
          Notifications
        </h2>
        <ul className="divide-y divide-white/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/10 border border-white/20">
          {notifications!.map((notification) => {
            return (
              <li key={notification.id}>
                <div
                  className="flex items-center justify-between py-4 px-6 hover:scale-105 transition-all duration-300 text-white/90
             hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:ring-2 hover:ring-white/30
             rounded-xl"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-lg">
                      {notification.message ?? "Anonymous"}
                    </span>
                  </div>
                </div>{" "}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Notifications;
