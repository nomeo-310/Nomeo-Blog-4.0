"use client";

import { motion }         from "framer-motion";
import Image              from "next/image";
import { HugeiconsIcon }  from "@hugeicons/react";
import Logo                from "@/public/images/logo.webp";
import { securityFeatures, infrastructureBadges } from "../security-content";

export function SecurityPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
      {/* Subtle glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10  left-10  w-72 h-72 rounded-full bg-white/5  blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white/5  blur-3xl" />
        <div className="absolute top-1/2  left-1/2  w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col justify-between p-12 w-full overflow-y-auto">

        {/* Logo + wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 flex items-center gap-3"
        >
          <Image src={Logo} alt="Nomeo_Logo" width={40} height={40} className="rounded-xl" />
          <div>
            <span className="text-white text-xl font-bold tracking-tight font-heading">Nomeo</span>
            <span className="block text-white/60 text-xs tracking-widest uppercase">Admin Console</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-white font-heading leading-tight mb-4">
            Admin Dashboard
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Secure access to manage writers, posts, applications, and platform operations.
          </p>
        </motion.div>

        {/* Security feature grid */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4 mb-12"
        >
          <h3 className="text-white text-base font-semibold mb-4">Enterprise Security</h3>
          <div className="grid grid-cols-2 gap-3">
            {securityFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
              >
                <HugeiconsIcon icon={f.icon} className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold mb-0.5">{f.title}</p>
                  <p className="text-white/55 text-[11px] leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Infrastructure footer */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex flex-wrap items-center gap-4 text-white/50 text-xs border-t border-white/10 pt-5">
            {infrastructureBadges.map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={badge.icon} className="w-4 h-4" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
