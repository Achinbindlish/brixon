import { useAdminOrders, useUpdateOrderStatus } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  invoiced: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminOrders = () => {
  const { data: orders, isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!orders?.length) {
    return <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No orders yet</div>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const profile = order.profiles as any;
        const items = order.order_items as any[];
        return (
          <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || "Unknown"} {profile?.phone ? `• ${profile.phone}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("en-IN")} • Order #{order.id.slice(0, 8)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.status] || ""}`}>
                  {order.status}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className="h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Article</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-foreground font-medium">{item.article_number} {item.description ? `- ${item.description}` : ""}</td>
                      <td className="px-4 py-2 text-right text-foreground">₹{item.price?.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2 text-right text-foreground">{item.quantity} {item.stock_unit}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">₹{item.total?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-foreground">Grand Total</td>
                    <td className="px-4 py-2 text-right font-bold text-foreground">₹{order.grand_total?.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminOrders;
