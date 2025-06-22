import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapComponent } from "@/components/map-component";
import { io, type Socket } from "socket.io-client";
import { AIAnalysis } from "@/components/AIAnalysis";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  ArrowLeft, 
  User, 
  Settings,
  MapPin,
  Clock,
  Users,
  Phone,
  Ambulance,
  HandHeart,
  Zap,
  Shield,
  LifeBuoy,
  LogOut,
  MessageSquare,
  CheckCircle
} from "lucide-react";

export default function UserDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emergencyType, setEmergencyType] = useState("");
  const [description, setDescription] = useState("");
  const [userLocation, setUserLocation] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server for user dashboard.");
      if (user?.id) {
        newSocket.emit("join_user_room", user.id);
      }
    });

    newSocket.on("request_approved", (approvedRequest) => {
      queryClient.setQueryData(["/api/sos-requests"], (oldData: any[] | undefined) => {
        if (!oldData) return [approvedRequest];
        return oldData.map(req => req.id === approvedRequest.id ? approvedRequest : req);
      });
      toast({
        title: "Help is on the way!",
        description: "An NGO has accepted your request and is connecting.",
      });
      setTimeout(() => {
        setLocation(`/chat/${approvedRequest.id}`);
      }, 1500);
    });

    return () => {
      newSocket.off("request_approved");
      newSocket.disconnect();
    };
  }, [toast, user?.id, setLocation]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
      });
    }
  }, []);

  const { data: sosRequests, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sos-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sos-requests");
      return res.json();
    }
  });

  const { data: ngos } = useQuery<any[]>({
    queryKey: ["/api/ngos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ngos");
      return res.json();
    }
  });

  const createSOSMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sos-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "SOS Alert Sent!",
        description: "Your emergency alert has been sent to all nearby rescue teams.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sos-requests"] });
      setEmergencyType("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send SOS",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSOS = () => {
    if (!emergencyType) {
      toast({
        title: "Please select emergency type",
        variant: "destructive",
      });
      return;
    }

    createSOSMutation.mutate({
      emergencyType,
      description,
      location: userLocation || user?.location || "Location unavailable",
    });
  };

  const activeRequest = sosRequests?.find(req => req.status === 'approved');
  const pendingRequest = sosRequests?.find(req => req.status === 'pending');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <LifeBuoy className="h-7 w-7 text-primary" />
              <span className="font-semibold text-lg">Emergency Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              <ModeToggle />
              <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Hello, {user?.name}</h1>
                  <p className="text-muted-foreground">Stay safe. Help is always available when you need it.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-500">System Online</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div 
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Request Emergency Assistance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Select value={emergencyType} onValueChange={setEmergencyType}>
                      <SelectTrigger><SelectValue placeholder="Select emergency type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural-disaster">Natural Disaster</SelectItem>
                        <SelectItem value="medical">Medical Emergency</SelectItem>
                        <SelectItem value="fire">Fire Incident</SelectItem>
                        <SelectItem value="crime">Crime in Progress</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the situation in detail..."
                      rows={4}
                    />
                  </div>
                </div>

                <AIAnalysis description={description} />
                
                <Button onClick={handleSOS} disabled={createSOSMutation.isPending} className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Send SOS Alert
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader><CardTitle>Your Location</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden">
                  <MapComponent />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Your location is shared automatically when you send an SOS.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {activeRequest ? (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800"><CheckCircle className="mr-2"/> Help is on the way!</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>{activeRequest.ngo.orgName}</strong> has accepted your request.</p>
                <p>They are now in a private chat with you.</p>
                <Button className="mt-4" onClick={() => setLocation(`/chat/${activeRequest.id}`)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Go to Chat
                </Button>
              </CardContent>
            </Card>
          ) : pendingRequest ? (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800"><Clock className="mr-2"/> Request Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Your SOS request has been sent. We are waiting for an NGO to respond.</p>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>
        
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Available NGOs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ngos?.map((ngo) => (
                <Card key={ngo.id}>
                  <CardContent className="p-4 flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <HandHeart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{ngo.orgName}</p>
                      <p className="text-sm text-muted-foreground">{ngo.specialties?.join(", ") || 'No specialties listed'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
