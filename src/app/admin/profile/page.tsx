import Image from "next/image";
import { AdminPage } from "@/components/admin/ui";
import { Badge } from "@/components/portal/Badge";
import { Button, Card } from "@/components/independent/ui";
import { adminAccounts } from "@/lib/admin/data/settings";

/** The signed-in admin — the owner row of the same list "Admin accounts" renders. */
const me = adminAccounts[0];

const FIELDS = [
  ["Name", me.name],
  ["Email", me.email],
  ["Role", me.role],
  ["Last active", me.lastActive],
] as const;

export default function AdminProfile() {
  return (
    <AdminPage title="Profile" actions={<Button size="sm">Edit profile</Button>}>
      <Card className="flex flex-col gap-6 p-[18px]">
        <div className="flex items-center gap-4">
          <Image src="/admin/avatar.jpg" alt="" width={128} height={128} className="size-16 rounded-full bg-[#d2d8db] object-cover" />
          <div className="flex flex-col gap-1">
            <p className="text-[18px] leading-[1.45] font-semibold text-ink-deep">{me.name}</p>
            <p className="text-[12.5px] text-muted">{me.email}</p>
          </div>
          <Badge tone={me.tone}>{me.status}</Badge>
        </div>

        <dl className="flex flex-wrap gap-4">
          {FIELDS.map(([label, value]) => (
            <div key={label} className="flex min-w-[180px] flex-1 flex-col gap-1 rounded-lg bg-surface-alt p-3 leading-[1.45]">
              <dt className="text-[12.5px] text-muted">{label}</dt>
              <dd className="text-[13px] text-ink-deep">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </AdminPage>
  );
}
