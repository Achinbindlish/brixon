import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";
import brixonLogo from "@/assets/brixon-logo.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess("Password reset link sent to your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src={brixonLogo} alt="Brixon" className="h-20 w-auto object-contain" />
          <p className="text-foreground/60 text-xs tracking-wide">
            {mode === "login" ? "Sign in to your account" : "Reset your password"}
          </p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full h-11 px-3 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full h-11 px-3 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Please wait..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full h-11 px-3 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
            />

            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-3 pt-4 text-[11px] text-muted-foreground">
          <Link to="/page/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/page/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span>·</span>
          <Link to="/page/contacts" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
