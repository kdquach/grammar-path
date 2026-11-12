import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, LogIn, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (mode === "register") {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        setErrorMessage("Please enter a display name.");
        return;
      }
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters.");
        return;
      }

      try {
        setIsLoading(true);
        await register({
          email: trimmedEmail,
          password,
          displayName: trimmedName,
        });
        onClose();
      } catch (err: any) {
        setErrorMessage(
          err.message || "Failed to create account. Please check your information."
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        setIsLoading(true);
        await login({
          email: trimmedEmail,
          password,
        });
        onClose();
      } catch (err: any) {
        setErrorMessage(
          err.message || "Invalid email or password. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 m-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign In to GrammarPath" : "Create Learner Account"}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pt-6 px-6 pb-2 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center shadow-2xs">
            {mode === "login" ? (
              <LogIn className="w-6 h-6" />
            ) : (
              <UserPlus className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            {mode === "login" ? "Sign In to GrammarPath" : "Create Learner Account"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "login"
              ? "Access your learning progress, saved attempts, and personalized mistake review."
              : "Track your progress through all 145 Cambridge English units."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="e.g. Alex Johnson"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="learner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            data-testid="auth-submit-button"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
              </>
            ) : (
              <span>{mode === "login" ? "Sign In" : "Register Account"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default AuthModal;
