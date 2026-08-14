import { redirect } from "next/navigation";

export default function CustomerTrackingRedirectPage() {
  redirect("/dashboard/reports/tracking");
}
