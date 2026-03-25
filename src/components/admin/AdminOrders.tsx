import { useAdminOrders, useUpdateOrderStatus } from "@/hooks/useAdmin";
import { Loader2, Package } from "lucide-react";
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
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center space-y-3">
        <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <p className="text-xs text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>

      {orders.map((order) => {
        const profile = order.profiles as any;
        const items = order.order_items as any[];
        return (
          <div key={order.id} className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Order Header */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {profile?.full_name || "Unknown"}
                    {profile?.phone && <span className="text-muted-foreground font-normal"> • {profile.phone}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} • #{order.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status] || "bg-muted text-muted-foreground"}`}>
                    {order.status}
                  </span>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Article</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-foreground">{item.article_number}</span>
                        {item.description && <span className="text-xs text-muted-foreground ml-1.5">— {item.description}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-foreground">₹{item.price?.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-foreground">{item.quantity} {item.stock_unit}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium text-foreground">₹{item.total?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-foreground">Grand Total</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-foreground">₹{order.grand_total?.toLocaleString("en-IN")}</td>
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
