import { redirect } from "next/navigation";

/**
 * The separate Edit profile page is retired: the profile is edited in place now, each part from the
 * edit link on its right (IN-061). An old link or bookmark lands in the header's editor.
 */
export default function EditProfile() {
  redirect("/independent/profile?edit=profile");
}
