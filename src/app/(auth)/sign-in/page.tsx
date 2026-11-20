import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  // useSearchParams() inside the form needs a Suspense boundary
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
