"use client";

import { useAuthModal, useLegalModal } from "@/stores/modal-store";
import AuthModal from "./auth-modal";

export default function AuthSection() {
  const { isOpen, mode, close, setMode } = useAuthModal();
  const { open: openLegal } = useLegalModal();

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={close}
      mode={mode}
      onSwitchMode={setMode}
      onOpenLegal={openLegal}
    />
  );
}