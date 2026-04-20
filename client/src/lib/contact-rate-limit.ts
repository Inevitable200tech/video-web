// LocalStorage key for tracking contact messages
const CONTACT_MESSAGE_KEY = "lastContactMessageTime";

/**
 * Get the time of the last contact message submission
 */
export const getLastMessageTime = (): number | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CONTACT_MESSAGE_KEY);
  return stored ? parseInt(stored, 10) : null;
};

/**
 * Set the current time as the last message submission time
 */
export const setLastMessageTime = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTACT_MESSAGE_KEY, Date.now().toString());
};

/**
 * Check if user can submit a message (not more than 1 per week)
 */
export const canSubmitMessage = (): boolean => {
  const lastTime = getLastMessageTime();
  if (lastTime === null) return true;

  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  const timeSinceLastMessage = Date.now() - lastTime;

  return timeSinceLastMessage >= oneWeekInMs;
};

/**
 * Get remaining time until next message can be sent (in ms)
 */
export const getRemainingCooldown = (): number => {
  const lastTime = getLastMessageTime();
  if (lastTime === null) return 0;

  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  const timeSinceLastMessage = Date.now() - lastTime;
  const remaining = oneWeekInMs - timeSinceLastMessage;

  return remaining > 0 ? remaining : 0;
};

/**
 * Format remaining time in a human-readable format
 */
export const formatRemainingTime = (ms: number): string => {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Clear the message submission history (for admin/testing purposes)
 */
export const clearMessageHistory = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONTACT_MESSAGE_KEY);
};
