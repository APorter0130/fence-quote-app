import { redirect } from "next/navigation";

// The public pitch page is not part of the product yet. Contractors are added by invitation,
// and homeowners only ever see the embedded estimator, so send stray visitors to signup.
export default function HomePage() {
  redirect("/onboard");
}
