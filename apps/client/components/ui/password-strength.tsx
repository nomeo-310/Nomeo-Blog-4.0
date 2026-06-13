// components/ui/password-strength.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon, Alert02Icon } from "@hugeicons/core-free-icons";

// Types
export interface PasswordStrengthProps {
  password: string;
  showProgress?: boolean;
  showRequirements?: boolean;
  className?: string;
  onStrengthChange?: (strength: PasswordStrengthLevel) => void;
}

export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

// Password strength configuration
const getStrengthConfig = (score: number) => {
  if (score <= 2) return { level: "weak" as PasswordStrengthLevel, color: "red", text: "Weak", progress: 25 };
  if (score === 3) return { level: "fair" as PasswordStrengthLevel, color: "orange", text: "Fair", progress: 50 };
  if (score === 4) return { level: "good" as PasswordStrengthLevel, color: "blue", text: "Good", progress: 75 };
  return { level: "strong" as PasswordStrengthLevel, color: "green", text: "Strong", progress: 100 };
};

// Calculate password strength score (0-5)
const calculateStrength = (password: string): number => {
  let score = 0;
  
  if (!password) return 0;
  
  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Cap at 5
  return Math.min(score, 5);
};

// Get password requirements
const getRequirements = (password: string): PasswordRequirement[] => {
  return [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: "At least 12 characters (recommended)",
      test: (pwd) => pwd.length >= 12,
      met: password.length >= 12,
    },
    {
      label: "Contains uppercase letter (A-Z)",
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter (a-z)",
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains number (0-9)",
      test: (pwd) => /[0-9]/.test(pwd),
      met: /[0-9]/.test(password),
    },
    {
      label: "Contains special character (!@#$%^&*)",
      test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
};

// Progress Bar Component
const StrengthProgressBar = ({ progress, color }: { progress: number; color: string }) => {
  const colorClasses = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
  };

  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`h-full rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
      />
    </div>
  );
};

// Strength Label Component
const StrengthLabel = ({ level, text, color }: { level: PasswordStrengthLevel; text: string; color: string }) => {
  const colorClasses = {
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
  };

  const icons = {
    weak: <HugeiconsIcon icon={Alert02Icon} size={14} />,
    fair: <HugeiconsIcon icon={Alert02Icon} size={14} />,
    good: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />,
    strong: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${colorClasses[color as keyof typeof colorClasses]}`}>
      {icons[level]}
      <span>Password Strength: {text}</span>
    </div>
  );
};

// Requirement Item Component
const RequirementItem = ({ label, met }: { label: string; met: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-xs"
    >
      <AnimatePresence mode="wait">
        {met ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            key="cancel"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <HugeiconsIcon icon={CancelCircleIcon} size={14} className="text-gray-400" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className={met ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-500"}>
        {label}
      </span>
    </motion.div>
  );
};

// Main Password Strength Component
export const PasswordStrength = ({
  password,
  showProgress = true,
  showRequirements = true,
  className = "",
  onStrengthChange,
}: PasswordStrengthProps) => {
  const [strength, setStrength] = useState<PasswordStrengthLevel>("weak");
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const newScore = calculateStrength(password);
    const config = getStrengthConfig(newScore);
    setScore(newScore);
    setStrength(config.level);
    setRequirements(getRequirements(password));
    
    if (onStrengthChange) {
      onStrengthChange(config.level);
    }
  }, [password, onStrengthChange]);

  const config = getStrengthConfig(score);
  const metCount = requirements.filter(r => r.met).length;
  const totalCount = requirements.length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      {showProgress && password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <StrengthLabel level={strength} text={config.text} color={config.color} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {metCount}/{totalCount}
            </span>
          </div>
          <StrengthProgressBar progress={config.progress} color={config.color} />
        </div>
      )}

      {/* Requirements List */}
      {showRequirements && password && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Password requirements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {requirements.map((req, index) => (
              <RequirementItem key={index} label={req.label} met={req.met} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable hook for password validation
export const usePasswordValidation = (password: string) => {
  const [score, setScore] = useState(0);
  const [strength, setStrength] = useState<PasswordStrengthLevel>("weak");
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const newScore = calculateStrength(password);
    const config = getStrengthConfig(newScore);
    const reqs = getRequirements(password);
    
    setScore(newScore);
    setStrength(config.level);
    setRequirements(reqs);
    
    // Consider valid if at least 4 requirements are met (or customize as needed)
    const metCount = reqs.filter(r => r.met).length;
    setIsValid(metCount >= 4 && password.length >= 8);
  }, [password]);

  return {
    score,
    strength,
    requirements,
    isValid,
    strengthText: getStrengthConfig(score).text,
    strengthColor: getStrengthConfig(score).color,
    progress: getStrengthConfig(score).progress,
    metCount: requirements.filter(r => r.met).length,
    totalCount: requirements.length,
  };
};