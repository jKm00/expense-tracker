import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import type { TransactionWithProduct } from "../transaction.models";

export function TransactionListItem({
  row,
}: {
  row: TransactionWithProduct;
}) {
  const { transaction, product } = row;

  return (
    <Link
      to="/dashboard/transactions/$id"
      params={{ id: transaction.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">
              {product?.name ?? "Unknown"}
            </p>
            {transaction.description && (
              <p className="text-sm text-muted-foreground truncate">
                {transaction.description}
              </p>
            )}
          </div>
          <div className="text-right ml-4 shrink-0">
            <p
              className={`font-semibold ${
                transaction.type === "income"
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {transaction.type === "income" ? "+" : "-"}
              {Number(transaction.price).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{transaction.date}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
