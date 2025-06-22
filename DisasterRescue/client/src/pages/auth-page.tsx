import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HandHeart, AlertTriangle, Users, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  orgName: z.string().optional(),
  coverageArea: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'user' | 'ngo'>('user');

  useEffect(() => {
    if (user) {
      if (user.role === 'user') {
        setLocation('/dashboard');
      } else if (user.role === 'ngo') {
        setLocation('/ngo');
      }
    }
  }, [user, setLocation]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    if (role === 'user' || role === 'ngo') {
      setSelectedRole(role);
      setIsLogin(false);
    }
  }, []);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: selectedRole,
      location: "",
      orgName: "",
      coverageArea: "",
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate({ ...data, role: selectedRole });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8">
        {/* Left Panel - Form */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="absolute left-4 top-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <HandHeart className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">DisasterHelp</span>
            </div>
            <CardTitle className="text-xl">
              {isLogin ? "Welcome Back" : `Join as ${selectedRole === 'user' ? 'User' : 'NGO'}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selection */}
            {!isLogin && (
              <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
                <Button
                  variant={selectedRole === 'user' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedRole('user')}
                  className="flex-1"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  User/Victim
                </Button>
                <Button
                  variant={selectedRole === 'ngo' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedRole('ngo')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  NGO/Rescue
                </Button>
              </div>
            )}

            {/* Login Form */}
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    {...loginForm.register("username")}
                    className="mt-1"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register("password")}
                    className="mt-1"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    {...registerForm.register("username")}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    {...registerForm.register("password")}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    {...registerForm.register("name")}
                    className="mt-1"
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="City, State"
                    {...registerForm.register("location")}
                    className="mt-1"
                  />
                </div>
                
                {selectedRole === 'ngo' && (
                  <>
                    <div>
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        type="text"
                        {...registerForm.register("orgName")}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coverageArea">Coverage Area</Label>
                      <Textarea
                        id="coverageArea"
                        placeholder="Describe your service area..."
                        {...registerForm.register("coverageArea")}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Switch between login and register */}
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Hero */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center space-y-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-8">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            {selectedRole === 'user' ? (
              <AlertTriangle className="h-12 w-12 text-red-600" />
            ) : (
              <HandHeart className="h-12 w-12 text-blue-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {selectedRole === 'user' ? 'Emergency Assistance' : 'Rescue Coordination'}
          </h2>
          <p className="text-gray-600 max-w-sm">
            {selectedRole === 'user' 
              ? 'Get immediate help during emergencies. Connect with rescue teams instantly and share your location for faster response.'
              : 'Coordinate emergency responses efficiently. Manage rescue operations, communicate with victims, and save lives.'
            }
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time communication</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Location sharing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Instant notifications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
