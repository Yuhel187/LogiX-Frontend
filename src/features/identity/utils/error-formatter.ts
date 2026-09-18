type TFunc = (key: string) => string;

export function formatAuthError(
  rawError: unknown,
  t: TFunc,
  defaultKey = "auth.loginErrorDefault"
): string {
  const message =
    typeof rawError === "string"
      ? rawError
      : (rawError instanceof Error ? rawError.message : (rawError as Record<string, unknown>)?.["message"] as string) || "";

  if (!message) {
    return t(defaultKey) || "An error occurred.";
  }

  if (
    message.includes("Email hoặc mật khẩu không chính xác") ||
    message.includes("Invalid credentials") ||
    message.includes("invalid password")
  ) {
    return t("auth.invalidCredentialsError") || t(defaultKey);
  }

  if (message.includes("khóa") || message.includes("ngừng hoạt động") || message.includes("locked")) {
    return t("auth.accountLockedError");
  }

  if (message.includes("chưa tham gia tổ chức") || message.includes("active organization")) {
    return t("auth.noActiveOrganizationError");
  }

  if (message.includes("đã tồn tại trên hệ thống")) {
    return t("auth.accountExistsLoginPromptError");
  }

  if (message.includes("đã được đăng ký") || message.includes("already registered") || message.includes("already exists")) {
    return t("auth.emailAlreadyRegisteredError");
  }

  if (message.includes("không phản hồi") || message.includes("Identity Service") || message.includes("Bad Gateway")) {
    return t("auth.serviceUnavailableError");
  }

  if (message.includes("Mật khẩu xác nhận không khớp") || message.includes("mismatch")) {
    return t("auth.passwordMismatchError");
  }

  if (message.includes("Thiếu mã xác thực") || message.includes("token")) {
    return t("auth.missingTokenError");
  }

  return t(defaultKey) || message;
}
