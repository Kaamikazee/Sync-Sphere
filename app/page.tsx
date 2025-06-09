"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import io, { Socket } from "socket.io-client";

interface Activity {
  id: string;
  name: string;
  timeSpent: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

// Create a global socket variable.
// (In a production app, consider using a dedicated module to create and export the socket.)
let socket: Socket | null = null;

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:5555");
    }
  }, []);
}

/*  
  Timer Component
  ----------------
  The Timer now receives an onUpdate callback that accepts the latest elapsed time and
  the activity's id. Whenever the timer updates its state (every second) or receives a socket
  update from the server ("timerUpdated"), it invokes onUpdate with the new value.
*/

const Timer: React.FC<{
  activity: Activity;
  onUpdate: (newTime: number, id: string) => void;
}> = ({ activity, onUpdate }) => {
  const [time, setTime] = useState(activity.timeSpent);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  // baselineRef will hold the activity's timeSpent at the moment the timer is started.
  const baselineRef = useRef<number>(activity.timeSpent);

  useEffect(() => {
    const handleStart = (data: { activityId: string; startTime: number; baseline: number }) => {
      if (data.activityId !== activity.id) return;
      baselineRef.current = data.baseline;
      setTime(data.baseline);
      setStartTime(data.startTime);
      setRunning(true);
    };
    socket.on("activityStarted", handleStart);
    return () => { socket.off("activityStarted", handleStart); };
  }, [activity.id]);

   
  

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = baselineRef.current + elapsed;
      setTime(newTime);
      onUpdate(newTime, activity.id);
      // Broadcast this tick (only one client needs to—but it's simplest if all do)
      socket.emit("updateTimer", { activityId: activity.id, elapsedTime: newTime });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, startTime, activity.id, onUpdate]);

  useEffect(() => {
    const handleTick = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== activity.id) return;
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, activity.id);
    };
    socket.on("timerUpdated", handleTick);
    return () => { socket.off("timerUpdated", handleTick); };
  }, [activity.id, onUpdate]);

  // 4) Listen for remote stops
  useEffect(() => {
    const handleStop = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== activity.id) return;
      setRunning(false);
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, activity.id);
    };
    socket.on("activityStopped", handleStop);
    return () => { socket.off("activityStopped", handleStop); };
  }, [activity.id, onUpdate]);



  const handleStart = () => {
    baselineRef.current = activity.timeSpent;
    const now = Date.now();
    setStartTime(now);
    setRunning(true);
    socket.emit("startActivity", {
      activityId: activity.id,
      startTime: now,
      baseline: activity.timeSpent,
    });
  };

  const handleStop = () => {
    setRunning(false);
    socket.emit("stopActivity", { activityId: activity.id, elapsedTime: time });
    onUpdate(time, activity.id);
  };

  return (
    <div>
      <p>Time Spent: {time} seconds</p>
      <button onClick={handleStart} disabled={running}>Start</button>
      <button onClick={handleStop} disabled={!running}>Stop</button>
    </div>
  );
};

/*  
  ActivityForm Component
  -------------------------
  A simple form to add a new activity. When a new activity is added,
  it gets pushed to the parent’s state.
*/
const ActivityForm: React.FC<{ onAdd: (activity: Activity) => void }> = ({ onAdd }) => {
  const [activityName, setActivityName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) return;
    const res = await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: activityName }),
    });
    if (res.ok) {
      const newActivity: Activity = await res.json();
      onAdd(newActivity);
      setActivityName("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter activity name"
        value={activityName}
        onChange={(e) => setActivityName(e.target.value)}
      />
      <button type="submit">Add Activity</button>
    </form>
  );
};

/*  
  TotalTime Component
  -----------------------
  This component calculates the total time by summing up the timeSpent value
  from all activities. Because the parent's state now updates whenever a Timer changes,
  this sum re-renders in real time.
*/
const TotalTime: React.FC<{ activities: Activity[] }> = ({ activities }) => {
  const total = activities.reduce((sum, act) => sum + act.timeSpent, 0);
  return <h3>Total Time Recorded: {total} seconds</h3>;
};

/*  
  HomePage Component
  -------------------------
  This is our main page:
  - It loads existing activities from the API.
  - It displays an ActivityForm to add new ones.
  - It renders a Timer for each activity, and passes an onUpdate callback that updates
    each activity’s timeSpent property in the parent's state.
*/
const HomePage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  useSocket();

  useEffect(() => {
    const fetchActivities = async () => {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const data: Activity[] = await res.json();
        setActivities(data);
      }
    };
    fetchActivities();
  }, []);

  // Callback for updating a specific activity's time in the parent's state.
  const updateActivityTime = useCallback((newTime: number, id: string) => {
    setActivities((prevActivities) =>
      prevActivities.map((activity) =>
        activity.id === id ? { ...activity, timeSpent: newTime } : activity
      )
    );
  }, []);

  return (
    <div>
      <h1>Activity Timer</h1>
      <ActivityForm onAdd={(activity) => setActivities([...activities, activity])} />
      {activities.map((activity) => (
        <div key={activity.id} style={{ borderBottom: "1px solid #ddd", padding: "10px 0" }}>
          <h2>{activity.name}</h2>
          <Timer activity={activity} onUpdate={updateActivityTime} />
        </div>
      ))}
      <TotalTime activities={activities} />
    </div>
  );
};

export default HomePage;
