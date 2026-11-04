import { redirect } from "next/navigation";

export default function AccountsHome() {
  redirect("/accounts/entries");
}
