import type { Locale } from "@/components/shared/locale-switcher";

export interface IdentityLocale {
  brandTitle: string;
  brandHighlight: string;
  brandSubtitle: string;
  consoleBadge: string;
  loginTitle: string;
  loginSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitButton: string;
  orContinueWith: string;
  googleButton: string;
  noAccountText: string;
  registerText: string;
  copyright: string;
}

export const identityLocales: Record<Locale, IdentityLocale> = {
  vi: {
    brandTitle: "Hệ thống quản trị",
    brandHighlight: "Logistics Toàn Diện",
    brandSubtitle: "Giải pháp vận hành tập trung đa dịch vụ. Tối ưu hóa chuỗi cung ứng của bạn ngay hôm nay.",
    consoleBadge: "LogiX Console",
    loginTitle: "Đăng nhập hệ thống",
    loginSubtitle: "Chào mừng bạn quay trở lại với LogiX OS",
    emailLabel: "Email",
    emailPlaceholder: "Nhập Email của bạn",
    passwordLabel: "Mật khẩu",
    passwordPlaceholder: "••••••••",
    submitButton: "Đăng nhập",
    orContinueWith: "HOẶC TIẾP TỤC VỚI",
    googleButton: "Tiếp tục với Google",
    noAccountText: "Chưa có tài khoản?",
    registerText: "Đăng ký tại đây",
    copyright: "© 2026 LogiX Vietnam. All rights reserved.",
  },
  en: {
    brandTitle: "Management System for",
    brandHighlight: "Comprehensive Logistics",
    brandSubtitle: "Multi-service centralized operations solution. Optimize your supply chain today.",
    consoleBadge: "LogiX Console",
    loginTitle: "System Login",
    loginSubtitle: "Welcome back to LogiX OS",
    emailLabel: "Email",
    emailPlaceholder: "Enter your email",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    submitButton: "Sign in",
    orContinueWith: "OR CONTINUE WITH",
    googleButton: "Continue with Google",
    noAccountText: "Don't have an account?",
    registerText: "Register here",
    copyright: "© 2026 LogiX Vietnam. All rights reserved.",
  },
};

export function getIdentityLocale(locale: Locale): IdentityLocale {
  return identityLocales[locale] || identityLocales.vi;
}

