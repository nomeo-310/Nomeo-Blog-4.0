import { create } from "zustand";
 
/**
 * Activity panel store — Nomeo.
 * -----------------------------
 * Controls the slide-in panel that holds Notifications + Connections. Kept in a
 * store so ANY component (the navbar bell, a toast action, a deep link, etc.)
 * can open it to a specific tab.
 *
 *   const { open } = useActivityPanel();
 *   open("connections");   // opens straight to the Connections tab
 */
export type ActivityTab = "notifications" | "connections";
 
interface ActivityPanelState {
  isOpen: boolean;
  tab: ActivityTab;
  open: (tab?: ActivityTab) => void;
  close: () => void;
  setTab: (tab: ActivityTab) => void;
  toggle: (tab?: ActivityTab) => void;
}
 
export const useActivityPanel = create<ActivityPanelState>((set, get) => ({
  isOpen: false,
  tab: "notifications",
  open: (tab) => set({ isOpen: true, ...(tab ? { tab } : {}) }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ tab }),
  toggle: (tab) => {
    const { isOpen } = get();
    set({ isOpen: !isOpen, ...(tab ? { tab } : {}) });
  },
}));