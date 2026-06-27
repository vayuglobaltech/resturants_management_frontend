import { PagePlaceholder } from "@/components/ui/PagePlaceholder";
import { PlusCircle } from "lucide-react";

export default function NewOrderPage() {
  return (
    <PagePlaceholder
      title="New Order"
      description="Create a new order for a table. Select items, apply discounts, and send to the kitchen."
      icon={<PlusCircle className="h-16 w-16 text-indigo-400" />}
    />
  );
}