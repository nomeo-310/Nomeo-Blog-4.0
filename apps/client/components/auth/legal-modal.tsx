"use client";

import Modal from "@/components/ui/modal";
import { Loader2 } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string; // The actual text content passed in
  isLoading?: boolean;
}

export default function LegalModal({ isOpen, onClose, title, content, isLoading = false }: LegalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={title}         
      showCloseButton
      closeOnOutsideClick
      closeOnEscape
      maxHeight
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {content}
        </div>
      )}
    </Modal>
  );
}