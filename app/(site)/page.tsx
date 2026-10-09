import { redirect } from "next/navigation";

/** `/` is the live page now (IA spec §2.4): the old home hero lives at the top of /live. */
export default function Home() {
  redirect("/live");
}
