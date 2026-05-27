export const QUICK_ASSIST_TYPING_PLACEHOLDER_ID =
  "quick-assist-typing-placeholder";

const STORAGE_PREFIX = "pawcruz_quick_assist_po";

function storage() {
  return typeof sessionStorage !== "undefined" ? sessionStorage : null;
}

export function quickAssistStorageKey(userId) {
  if (userId === undefined || userId === null || userId === "") return null;
  return `${STORAGE_PREFIX}:${String(userId)}`;
}

function dropLegacyLocal(key) {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadQuickAssistMessages(userId) {
  const key = quickAssistStorageKey(userId);
  if (!key) return null;
  dropLegacyLocal(key);

  const ss = storage();
  if (!ss) return null;

  try {
    const raw = ss.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const cleaned = parsed.filter(
      (message) =>
        message &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string" &&
        typeof message.id === "string" &&
        message.id !== QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
    );

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

export function saveQuickAssistMessages(userId, messages) {
  const key = quickAssistStorageKey(userId);
  if (!key) return;
  dropLegacyLocal(key);

  const ss = storage();
  if (!ss) return;

  const toSave = messages.filter(
    (message) => message.id !== QUICK_ASSIST_TYPING_PLACEHOLDER_ID,
  );

  try {
    ss.setItem(key, JSON.stringify(toSave));
  } catch {
    /* storage quota or private mode */
  }
}

export function clearQuickAssistForCurrentPetOwner() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.role !== "pet_owner") return;

    const key = quickAssistStorageKey(user.id);
    if (!key) return;

    dropLegacyLocal(key);
    const ss = storage();
    if (ss) ss.removeItem(key);
  } catch {
    /* ignore */
  }
}
