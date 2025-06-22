import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  HandHeart, 
  Users, 
  AlertTriangle, 
  MapPin, 
  MessageCircle, 
  Clock,
  Phone,
  Info
} from "lucide-react";
import { useEffect } from "react";

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role === 'user') {
        setLocation('/dashboard');
      } else if (user.role === 'ngo') {
        setLocation('/ngo');
      }
    }
  }, [user, setLocation]);

  const handleRoleSelection = (role: 'user' | 'ngo') => {
    setLocation(`/auth?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <HandHeart className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">DisasterHelp</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <Info className="h-4 w-4 mr-2" />
                About
              </Button>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <Phone className="h-4 w-4 mr-2" />
                Emergency: 911
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-emerald-900/50"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Content */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Emergency Help When You Need It Most
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
                Connect disaster victims with rescue teams instantly. Real-time communication, location sharing, and coordinated emergency response.
              </p>
              <div className="flex items-center justify-center space-x-4 text-white/80">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>24/7 Response</span>
                </div>
                <div className="h-4 w-px bg-white/40"></div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Real-time Location</span>
                </div>
                <div className="h-4 w-px bg-white/40"></div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Instant Communication</span>
                </div>
              </div>
            </div>

            {/* Role Selection Split Screen */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Victim/User Panel */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-red-200">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="h-10 w-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">I Need Help</h2>
                  <p className="text-gray-600 mb-6">
                    Are you in danger or need emergency assistance? Get connected with rescue teams immediately.
                  </p>
                  <ul className="text-left space-y-2 mb-8 text-gray-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Instant SOS alerts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Location sharing</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Direct communication</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleRoleSelection('user')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl"
                    size="lg"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Continue as Victim
                  </Button>
                </CardContent>
              </Card>

              {/* NGO/Rescue Panel */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <HandHeart className="h-10 w-10 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">I'm Here to Help</h2>
                  <p className="text-gray-600 mb-6">
                    Are you part of an NGO, rescue team, or relief organization? Help coordinate emergency responses.
                  </p>
                  <ul className="text-left space-y-2 mb-8 text-gray-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Receive SOS alerts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Coordinate rescues</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Track rescue progress</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleRoleSelection('ngo')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl"
                    size="lg"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Continue as NGO
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Features Section */}
            <div className="mt-16 text-center">
              <p className="text-white/80 mb-4">Powered by secure authentication and real-time technology</p>
              <div className="flex items-center justify-center space-x-8 text-white/60">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Secure Auth</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Real-time Chat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Mobile Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
