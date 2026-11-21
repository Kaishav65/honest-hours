import { LogOut } from "lucide-react";
import { connection } from "next/server";
import { logout } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

// Sidebar footer: avatar initial + display name from the profile, and a Log out button.
export async function UserBadge() {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims.sub;
  const { data: profile } = id
    ? await supabase.from("profiles").select("display_name").eq("id", id).single()
    : { data: null };
  const name = profile?.display_name ?? "My account";

  return (
    <div className="user">
      <div className="avatar" aria-hidden>
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="who">
        <div className="sm" style={{ fontWeight: 600 }}>
          {name}
        </div>
        <div className="xs muted">Balanced coach</div>
      </div>
      <form action={logout} style={{ marginLeft: "auto" }}>
        <button className="btn btn-ghost btn-sm btn-icon" title="Log out" aria-label="Log out">
          <LogOut className="lucide" aria-hidden />
        </button>
      </form>
    </div>
  );
}
