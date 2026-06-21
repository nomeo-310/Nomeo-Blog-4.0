import { create } from "zustand";

/**
 * Conversations panel store — a slide-in list of recent DMs, openable from
 * anywhere (the lounges header, etc). Mirrors the activity-panel pattern.
 */
interface ConversationsPanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useConversationsPanel = create<ConversationsPanelState>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}));