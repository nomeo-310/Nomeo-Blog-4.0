/**
 * GroupPosition — a message's position within a run of consecutive messages
 * from the same author, used to determine bubble corner-rounding (Google
 * Messages style). Shared between lounge-room-page.tsx (computes the
 * position while mapping messages) and lounge-message-bubble.tsx (renders
 * the bubble accordingly).
 */
export type GroupPosition = "single" | "first" | "middle" | "last";
