import { AuthFrame } from "@/components/portal/auth-shell";

/** Login and Sign up share one frame, kept in place as they switch (AuthFrame). */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthFrame>{children}</AuthFrame>;
}
