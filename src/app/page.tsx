import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// "/" just sends people where they belong.
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  redirect(session ? "/dashboard" : "/sign-in");
}
