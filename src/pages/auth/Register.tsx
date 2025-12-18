import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.string().min(1, "Please select a role"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      registerSchema.parse(formData);
      setLoading(true);

      const redirectUrl = `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: formData.name,
            role: formData.role,
          },
        },
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Account created successfully",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        {/* Auth Page Image */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <img
            src="/auth_page.svg"
            alt="TeamFlow Registration"
            className="w-full max-w-md h-auto object-contain mb-8 drop-shadow-2xl"
            onError={(e) => {
              // Try PNG fallback
              e.currentTarget.src = "/auth_page.png";
              e.currentTarget.onerror = () => {
                // Final fallback - hide image
                e.currentTarget.style.display = 'none';
              };
            }}
          />
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Join TeamFlow
            </h1>
            <p className="text-xl text-purple-100 mb-4">
              Start your journey with powerful project management tools
            </p>
            <div className="flex items-center justify-center space-x-6 text-purple-200">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                <span>Free to Start</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                <span>Easy Setup</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></div>
                <span>Team Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute top-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-1500"></div>
        <div className="absolute top-1/4 right-20 w-20 h-20 bg-blue-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white relative overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-blue-50/30"></div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 text-lg">
              Join thousands of teams using TeamFlow
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-4 pr-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-4 pr-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                Your Role
              </Label>
              <Select onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="pl-4 pr-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-4 pr-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pl-4 pr-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 transition-all duration-200"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Creating account...
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Button
                variant="link"
                className="px-0 text-purple-600 hover:text-purple-800 font-semibold"
                onClick={() => navigate("/auth/login")}
              >
                Sign In
              </Button>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="mt-6 text-center text-sm text-gray-500">
            By creating an account, you agree to our{" "}
            <button className="text-purple-600 hover:text-purple-800 underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="text-purple-600 hover:text-purple-800 underline">
              Privacy Policy
            </button>
          </div>

          {/* Social Registration Options */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                {/*<span className="px-2 bg-white text-gray-500">Or sign up with</span>*/}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {/*<Button*/}
              {/*  variant="outline"*/}
              {/*  className="w-full py-3 rounded-xl border-2 hover:bg-gray-50"*/}
              {/*  type="button"*/}
              {/*>*/}
              {/*  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">*/}
              {/*    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>*/}
              {/*    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>*/}
              {/*    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>*/}
              {/*    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>*/}
              {/*  </svg>*/}
              {/*  Google*/}
              {/*</Button>*/}
              {/*<Button*/}
              {/*  variant="outline"*/}
              {/*  className="w-full py-3 rounded-xl border-2 hover:bg-gray-50"*/}
              {/*  type="button"*/}
              {/*>*/}
              {/*  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">*/}
              {/*    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.022.027.025.051.018.078-.353 1.394-.402 1.559-.402 1.683 0 .402-.402.643-.827.643-.402 0-.827-.402-.827-.826 0-.402.201-1.306.603-2.711-.889-.889-1.406-2.278-1.406-3.662 0-4.462 3.662-8.566 10.548-8.566 5.540 0 9.844 3.945 9.844 9.212 0 5.540-2.911 9.844-7.618 9.844-1.518 0-2.911-.789-3.38-1.781l-.889 3.380c-.317 1.239-1.175 2.781-1.759 3.735 1.311.402 2.691.603 4.089.603 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>*/}
              {/*  </svg>*/}
              {/*  GitHub*/}
              {/*</Button>*/}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
