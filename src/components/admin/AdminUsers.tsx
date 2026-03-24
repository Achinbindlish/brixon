import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"salesperson" | "admin">("salesperson");
  const [showPassword, setShowPassword] = useState(false);

  // Fetch all profiles + roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = profiles?.map((p) => p.user_id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);

      const rolesMap: Record<string, string> = {};
      (roles || []).forEach((r) => { rolesMap[r.user_id] = r.role; });

      return (profiles || []).map((p) => ({
        ...p,
        role: rolesMap[p.user_id] || "salesperson",
      }));
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, full_name: fullName, phone, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setRole("salesperson");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user");
    },
  });

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Create New User
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="h-10 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="h-10 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email *"
            required
            className="h-10 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password *"
              required
              minLength={6}
              className="h-10 w-full px-3 pr-10 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "salesperson" | "admin")}
            className="h-10 px-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="salesperson">Salesperson</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => createUser.mutate()}
            disabled={!email || !password || password.length < 6 || createUser.isPending}
            className="h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create User
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">All Users</h3>
        </div>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-foreground">{u.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.phone || "—"}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" 
                          ? "bg-primary/10 text-primary" 
                          : "bg-secondary text-secondary-foreground"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
