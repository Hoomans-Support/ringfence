import { redirect } from "next/navigation";

export default function SurveyAppPage() {
  redirect("/review?week=4");
}
