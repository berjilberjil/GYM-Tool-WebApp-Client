import { redirect } from "next/navigation";

export default function SignupPage() {
  // New members must be added by a gym coach or manager. Contact your gym to get access.
  redirect(
    "/login?error=" +
      encodeURIComponent(
        "New members must be added by a gym coach or manager. Contact your gym to get access."
      )
  );
}
