import { redirect } from "next/navigation";

export default function JadwalTimPage() {
    redirect("/catatan-pekerjaan?view=kalender");
}
