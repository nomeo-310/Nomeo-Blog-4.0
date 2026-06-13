"use client";

import { useLegalModal } from "@/stores/modal-store";
import { useEffect, useState } from "react";
import LegalModal from "./legal-modal";

// Map document types to their file paths in public folder
const legalFiles = {
  terms: {
    title: "Terms of Service",
    path: "/legal/terms-of-service.txt",
  },
  privacy: {
    title: "Privacy Policy",
    path: "/legal/privacy-policy.txt",
  },
  data: {
    title: "Data Protection Policy",
    path: "/legal/data-protection-policy.txt",
  },
  guidelines: {
    title: "Community Guidelines",
    path: "/legal/community-guidelines.txt",
  },
  cookie: {
    title: "Cookie Policy",
    path: "/legal/cookie-policy.txt",
  },
};

export default function LegalSection() {
  const { isOpen, activeDoc, close } = useLegalModal();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && activeDoc) {
      setLoading(true);
      setContent("");

      const doc = legalFiles[activeDoc];
      if (!doc) {
        setContent("Document not found.");
        setLoading(false);
        return;
      }

      // Fetch the text file from public folder
      fetch(doc.path)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${doc.title}`);
          }
          return response.text();
        })
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error loading legal document:", error);
          setContent(`Unable to load ${doc.title}. Please try again later.`);
          setLoading(false);
        });
    }
  }, [isOpen, activeDoc]);

  if (!activeDoc) return null;

  const doc = legalFiles[activeDoc];
  if (!doc) return null;

  return (
    <LegalModal
      isOpen={isOpen}
      onClose={close}
      title={doc.title}
      content={content}
      isLoading={loading}
    />
  );
}