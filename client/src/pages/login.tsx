import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { SessionUser } from "@shared/schema";

export default function Login() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation(user.role === "admin" ? "/" : "/vehicles", { replace: true });
    }
  }, [user, setLocation]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = (await response.json()) as SessionUser;
      setUser(data);
      setLocation(data.role === "admin" ? "/" : "/vehicles", { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Unable to sign in with those credentials.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">FleetFlow Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Default admin: admin@example.com / admin123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
