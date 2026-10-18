import type { Metadata } from "next";
import { SelectScreen } from "@/components/SelectScreen";

export const metadata: Metadata = {
  title: "Student rodas",
};

export default function StudentHome() {
  return <SelectScreen audience="student" />;
}
