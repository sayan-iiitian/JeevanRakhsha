import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapComponent } from "@/components/map-component";
import { io, type Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Video,
  CheckCircle,
  Paperclip,
  Image,
  Mic,
  Send,
  MapPin,
  AlertTriangle,
  HandHeart,
  Users,
  Clock,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  params: { requestId: string };
}

const ChatMessage = ({ message, isSender, senderName }: any) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}
    >
      {!isSender && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <HandHeart className="h-5 w-5" />
        </div>
      )}
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-sm",
          isSender
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs opacity-70 mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
      {isSender && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <UserIcon className="h-5 w-5" />
        </div>
      )}
    </motion.div>
  );
};

export default function ChatInterface({ params }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const requestId = parseInt(params.requestId);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/chat", requestId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/chat/${requestId}`);
      return res.json();
    }
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server for chat.");
      newSocket.emit("join_sos_room", requestId);
    });

    newSocket.on("new_message", (newMessage) => {
      queryClient.setQueryData(["/api/chat", requestId], (oldData: any[] | undefined) => {
        if (!oldData) return [newMessage];
        if (oldData.some(msg => msg.id === newMessage.id)) {
          return oldData;
        }
        return [...oldData, newMessage];
      });
    });

    return () => {
      newSocket.off("new_message");
      newSocket.disconnect();
    };
  }, [requestId]);

  const { data: sosRequest } = useQuery<any>({
    queryKey: [`/api/sos-requests/${requestId}`],
    enabled: !!requestId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!socket) throw new Error("Socket not connected");
      socket.emit("chat", {
        sosRequestId: requestId,
        senderId: user?.id,
        content,
        messageType: "text",
      });
    },
    onSuccess: () => {
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeRescueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/sos-requests/${requestId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rescue Completed!",
        description: "Points have been awarded to your organization.",
      });
      setTimeout(() => {
        returnToDashboard();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete rescue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const returnToDashboard = () => {
    if (user?.role === 'ngo') {
      setLocation('/ngo');
    } else {
      setLocation('/dashboard');
    }
  };

  if (isLoading || !sosRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={returnToDashboard}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{sosRequest.emergencyType} Emergency</h2>
            <p className="text-sm text-muted-foreground">{sosRequest.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><Phone className="h-5 w-5" /></Button>
          <Button variant="outline" size="icon"><Video className="h-5 w-5" /></Button>
          {user?.role === 'ngo' && (
            <Button onClick={() => completeRescueMutation.mutate()} disabled={completeRescueMutation.isPending}>
              <CheckCircle className="h-5 w-5 mr-2" />
              {completeRescueMutation.isPending ? "Completing..." : "Mark as Resolved"}
            </Button>
          )}
        </div>
      </header>

      <main ref={scrollAreaRef} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {messages?.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSender={msg.senderId === user?.id}
                senderName={msg.senderId === user?.id ? user?.name : "NGO"}
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      <footer className="bg-card border-t border-border p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-4">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMessageMutation.isPending}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
