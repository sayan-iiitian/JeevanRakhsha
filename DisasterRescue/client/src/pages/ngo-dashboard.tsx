import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapComponent } from "@/components/map-component";
import { io, type Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  HandHeart,
  ArrowLeft,
  Building,
  Bell,
  AlertTriangle,
  MessageCircle,
  Trophy,
  Gauge,
  CheckCircle,
  Ambulance,
  Star,
  Users,
  MapPin,
  Clock,
  LogOut,
  ShieldCheck
} from "lucide-react";

export default function NGODashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState("all");
  const [filterDistance, setFilterDistance] = useState("all");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server for NGO dashboard.");
    });

    newSocket.on("new_sos_request", (newRequest) => {
      queryClient.setQueryData(["/api/sos-requests"], (oldData: any[] | undefined) => {
        if (!oldData) return [newRequest];
        if (oldData.some(req => req.id === newRequest.id)) {
          return oldData;
        }
        return [newRequest, ...oldData];
      });
      toast({
        title: "New SOS Request!",
        description: `Emergency: ${newRequest.emergencyType} at ${newRequest.location}`,
      });
    });

    return () => {
      newSocket.off("new_sos_request");
      newSocket.disconnect();
    };
  }, [toast]);

  const { data: sosRequests, isLoading: isLoadingRequests } = useQuery<any[]>({
    queryKey: ["/api/sos-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sos-requests");
      return res.json();
    }
  });

  const { data: ngos } = useQuery<any[]>({
    queryKey: ["/api/ngos"],
  });

  const { data: ngoProfile } = useQuery<any>({
    queryKey: ["/api/ngo/profile"],
    queryFn: async () => {
        const res = await apiRequest("GET", "/api/ngo/profile");
        return res.json();
    }
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("PATCH", `/api/sos-requests/${requestId}/approve`);
      return res.json();
    },
    onSuccess: (_, requestId) => {
      toast({
        title: "Request Approved!",
        description: "Connecting to chat room...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sos-requests"] });
      setTimeout(() => {
        setLocation(`/chat/${requestId}`);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingRequests = sosRequests?.filter(req => req.status === 'pending') || [];
  const activeRescues = sosRequests?.filter(req => req.status === 'approved') || [];

  const stats = {
    activeAlerts: pendingRequests.length,
    ongoingRescues: activeRescues.length,
    totalRescues: ngoProfile?.totalRescues || 0,
    pointsEarned: ngoProfile?.points || 0,
  };
  
  const getEmergencyIcon = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'medical': return <Ambulance className="h-5 w-5 text-red-500" />;
      case 'fire': return <ShieldCheck className="h-5 w-5 text-orange-500" />;
      case 'natural-disaster': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <HandHeart className="h-7 w-7 text-primary" />
                <span className="font-semibold text-lg">NGO Control Center</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Bell className="h-5 w-5" />
                {stats.activeAlerts > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center text-xs rounded-full p-1">
                    {stats.activeAlerts}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Building className="h-5 w-5" />
                <span className="text-sm font-medium">{ngoProfile?.orgName || "NGO Organization"}</span>
              </div>
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard"><Gauge className="h-4 w-4 mr-2" />Dashboard</TabsTrigger>
            <TabsTrigger value="requests">
              <AlertTriangle className="h-4 w-4 mr-2" />SOS Requests
              {stats.activeAlerts > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.activeAlerts}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              <MessageCircle className="h-4 w-4 mr-2" />Active Rescues
              {stats.ongoingRescues > 0 && (
                <Badge variant="secondary" className="ml-2">{stats.ongoingRescues}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-4 w-4 mr-2" />Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{stats.activeAlerts}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ongoing Rescues</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.ongoingRescues}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Rescues</p>
                      <p className="text-2xl font-bold text-green-600">{stats.totalRescues}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <HandHeart className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Points Earned</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pointsEarned}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Activity feed coming soon...</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Live Emergency Map</CardTitle></CardHeader>
                <CardContent><MapComponent /></CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {pendingRequests.map(request => (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center">
                            {getEmergencyIcon(request.emergencyType)}
                            <span className="ml-2">{request.emergencyType}</span>
                          </span>
                          <Badge variant="destructive">New</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-2" />
                            <span>{request.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-2" />
                            <span>{new Date(request.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-2" />
                            <span>{request.user?.name || 'Unknown User'}</span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => approveRequestMutation.mutate(request.id)}
                          disabled={approveRequestMutation.isPending && approveRequestMutation.variables === request.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {approveRequestMutation.isPending && approveRequestMutation.variables === request.id ? 'Approving...' : 'Approve Request'}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {pendingRequests.length === 0 && !isLoadingRequests && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No pending SOS requests.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeRescues.map(request => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        {getEmergencyIcon(request.emergencyType)}
                        <span className="ml-2">{request.emergencyType}</span>
                      </span>
                      <Badge variant="secondary">Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    <Button
                      className="w-full mt-4"
                      onClick={() => setLocation(`/chat/${request.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Open Chat
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeRescues.length === 0 && !isLoadingRequests && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active rescues.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Top Rescuers</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Leaderboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
