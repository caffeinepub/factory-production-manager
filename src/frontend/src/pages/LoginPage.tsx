import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Loader2, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setIsLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    const ok = await onLogin(username, password);
    if (!ok) {
      setError("Incorrect username or password.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.22_0.07_265)] via-[oklch(0.28_0.09_262)] to-[oklch(0.18_0.06_268)] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            oklch(0.9 0.02 260) 0px,
            oklch(0.9 0.02 260) 1px,
            transparent 1px,
            transparent 40px
          )`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl text-white">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg"
            >
              <Factory className="w-8 h-8 text-white" strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-2xl font-display font-bold text-white">
              Factory Production
            </h1>
            <p className="text-white/60 text-sm mt-1">Admin Login</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/80 text-sm">
                Username
              </Label>
              <Input
                id="username"
                data-ocid="login.username.input"
                type="text"
                autoComplete="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40 h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80 text-sm">
                Password
              </Label>
              <Input
                id="password"
                data-ocid="login.password.input"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40 h-11 rounded-xl"
              />
            </div>

            {error && (
              <p
                data-ocid="login.error_state"
                className="text-red-300 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              data-ocid="login.submit_button"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base rounded-xl gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
