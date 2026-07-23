import {
  ShieldPlusIcon,
  FingerAccessIcon,
  Clock02Icon,
  File02Icon,
  UserMultiple02Icon,
  Notification02Icon,
  ServerStack02Icon,
  Database01Icon,
  Globe02Icon,
  Activity04Icon,
} from "@hugeicons/core-free-icons";
import type { SecurityFeature, InfrastructureBadge } from "./types";

export const securityFeatures: SecurityFeature[] = [
  {
    icon: ShieldPlusIcon,
    title: "Military-Grade Encryption",
    desc: "All data encrypted with AES-256, ensuring your information remains confidential and secure from unauthorised access.",
  },
  {
    icon: FingerAccessIcon,
    title: "Three-Factor Authentication",
    desc: "Email, password, and seed-phrase verification provides enterprise-grade security against unauthorised access.",
  },
  {
    icon: Clock02Icon,
    title: "Automatic Session Management",
    desc: "Sessions automatically expire after inactivity, and you can view all active devices from your security dashboard.",
  },
  {
    icon: File02Icon,
    title: "Comprehensive Audit Logging",
    desc: "Every action, login attempt, and change is recorded with timestamps and IP addresses for complete accountability.",
  },
  {
    icon: UserMultiple02Icon,
    title: "Granular Access Control",
    desc: "Role-based permissions allow fine-tuned control over exactly what each admin can see, edit, and manage.",
  },
  {
    icon: Notification02Icon,
    title: "Real-Time Security Alerts",
    desc: "Instant notifications for suspicious activities, failed login attempts, or unauthorised access attempts.",
  },
];

export const infrastructureBadges: InfrastructureBadge[] = [
  { icon: ServerStack02Icon, label: "MongoDB Atlas" },
  { icon: Database01Icon,    label: "Encrypted Storage" },
  { icon: Globe02Icon,       label: "Cloudinary CDN" },
  { icon: Activity04Icon,    label: "Real-time Sync" },
];
