function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.includes("replace_with") ||
    normalized.includes("xxxxxxxx") ||
    normalized.includes("your_app_client_id")
  );
}

export const isDemoMode =
  isPlaceholder(import.meta.env.VITE_COGNITO_USER_POOL_ID) ||
  isPlaceholder(import.meta.env.VITE_COGNITO_CLIENT_ID);
