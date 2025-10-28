import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinExamSession: (sessionId: string, examId: string) => void;
  sendFaceVerification: (sessionId: string, imageData: string) => void;
  reportViolation: (violation: ViolationData) => void;
  liveData: any[];
  violations: any[];
}

interface ViolationData {
  sessionId: string;
  type: string;
  severity: string;
  description: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL =
  (import.meta.env?.VITE_SOCKET_URL as string) || "http://localhost:5000";

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);

  useEffect(() => {
    if (user && token) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: token,
        },
      });

      newSocket.on("connect", () => {
        console.log("Connected to server");
        setConnected(true);
        toast.success("Connected to monitoring system");
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        setConnected(false);
        toast.error("Disconnected from monitoring system");
      });

      newSocket.on("error", (error: any) => {
        console.error("Socket error:", error);
        toast.error(error.message || "Connection error");
      });

      // Real-time monitoring events
      newSocket.on("liveData", (data: any) => {
        setLiveData(data.activeSessions || []);
      });

      newSocket.on("violationAlert", (violation: any) => {
        setViolations((prev) => [violation, ...prev.slice(0, 49)]); // Keep last 50
        if (violation.urgent) {
          toast.error(
            `🚨 Critical violation: ${violation.violation.type} - ${violation.student.firstName} ${violation.student.lastName}`,
          );
        }
      });

      newSocket.on("studentJoinedExam", (data: any) => {
        toast.info(`Student ${data.student.firstName} joined exam session`, {
          description: new Date(data.timestamp).toLocaleTimeString(),
        });
      });

      newSocket.on("sessionStatusChanged", (data: any) => {
        toast.info(`Session status changed to ${data.newStatus}`);
      });

      newSocket.on("faceVerificationResult", (result: any) => {
        if (result.result === "failed") {
          toast.warning("Face verification failed");
        } else if (result.result === "verified") {
          toast.success("Face verified successfully");
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user, token]);

  const joinExamSession = (sessionId: string, examId: string) => {
    if (socket) {
      socket.emit("joinExamSession", { sessionId, examId });
    }
  };

  const sendFaceVerification = (sessionId: string, imageData: string) => {
    if (socket) {
      socket.emit("liveFaceVerification", { sessionId, imageData });
    }
  };

  const reportViolation = (violation: ViolationData) => {
    if (socket) {
      socket.emit("reportViolation", violation);
    }
  };

  const value = {
    socket,
    connected,
    joinExamSession,
    sendFaceVerification,
    reportViolation,
    liveData,
    violations,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
