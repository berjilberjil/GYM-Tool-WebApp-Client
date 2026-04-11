import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect(
    "/login?error=" +
      encodeURIComponent(
        "Sign-up is disabled in this app. Ask an existing admin to create your account or send you the correct login details."
      )
  );
}
