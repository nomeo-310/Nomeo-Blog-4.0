import { create } from 'zustand';

export type modalProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export type AuthMode = "sign-in" | "sign-up" | "forgot-password";

interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
  open: () => void;
  close: () => void;
  setMode: (mode: AuthMode) => void;
  toggleMode: () => void;
}

export type LegalDocType = "terms" | "privacy" | "data" | "guidelines";

interface LegalModalState {
  activeDoc: LegalDocType | null;
  isOpen: boolean;
  open: (doc: LegalDocType) => void;
  close: () => void;
}

interface OnboardingModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}


export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: "sign-in",
  
  open: () => set({ isOpen: true }),
  
  close: () => set({ isOpen: false }),
  
  setMode: (mode) => set({ mode }),
  
  toggleMode: () => set((state) => ({ 
    mode: state.mode === "sign-in" ? "sign-up" : "sign-in" 
  })),
}));

export const useLegalModal = create<LegalModalState>((set) => ({
  activeDoc: null,
  isOpen: false,
  
  open: (doc) => set({ activeDoc: doc, isOpen: true }),
  
  close: () => set({ activeDoc: null, isOpen: false }),
}));
 
export const useOnboardingModal = create<OnboardingModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));