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
      setLastEvent(JSON.parse(event.data));
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
    <SocketContext.Provider value={{ lastEvent, send, wsloading }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
