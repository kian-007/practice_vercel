import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useAuth } from "./authContext";

const SocketContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;
export const SocketProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [lastEvent, setLastEvent] = useState(null);
  const [wsloading, setWsloading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    // const socket = new WebSocket("ws://localhost:5000");
    const socket = new WebSocket(API_URL.replace(/^http/, "ws"));
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWsloading(false);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastEvent(data);

      if (data.type === "online_users") {
        setOnlineUsers(new Set(data.userIds.map(String)));
      }

      if (data.type === "user_online") {
        setOnlineUsers((prev) => new Set(prev).add(String(data.userId)));
      }

      if (data.type === "user_offline") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(String(data.userId));
          return next;
        });
      }
    };

    // socket.onclose = () => console.log("WebSocket disconnected");
    socket.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);

    return () => {
      socket.close();
      setWsloading(true);
    };
  }, [isLoggedIn]);

  const send = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <SocketContext.Provider value={{ lastEvent, send, wsloading, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
