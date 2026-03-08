import { Button } from "@/components/ui/button";
import { Factory, Loader2, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();

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
        {/* Card */}
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
            <p className="text-white/60 text-sm mt-1">Management System</p>
          </div>

          {/* Info */}
          <div className="bg-white/10 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="w-2 h-2 rounded-full bg-success" />
              Employee & Attendance Tracking
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="w-2 h-2 rounded-full bg-success" />
              Daily Production Entry
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="w-2 h-2 rounded-full bg-success" />
              Salary & Bank Transfer Sheets
            </div>
          </div>

          {/* Login Button */}
          <Button
            data-ocid="login.button"
            onClick={login}
            disabled={isLoggingIn || isInitializing}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base rounded-xl gap-2 touch-target"
          >
            {isLoggingIn || isInitializing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isInitializing ? "Loading..." : "Logging in..."}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Admin Login
              </>
            )}
          </Button>

          <p className="text-center text-white/40 text-xs mt-4">
            Secure login via Internet Identity
          </p>
        </div>
      </motion.div>
    </div>
  );
}
