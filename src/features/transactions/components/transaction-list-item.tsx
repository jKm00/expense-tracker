import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import type { TransactionWithProduct } from "../transaction.models";
import { DeleteTransactionDialog } from "./delete-transaction.alert";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { QuickEditTransactionForm } from "./quick-edit-transaction.form";

export function TransactionListItem({ row }: { row: TransactionWithProduct }) {
  const { transaction, product } = row;

  return (
    <Card className="hover:bg-accent/50 transition-colors py-0">
      <CardContent className="flex items-center gap-4">
        <Link
          to="/dashboard/transactions/$id"
          params={{ id: transaction.id }}
          className="flex grow items-center py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{product?.name ?? "Unknown"}</p>
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
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {transaction.type === "income" ? "+" : "-"}
              {Number(transaction.price).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {transaction.date.toLocaleString("en-UK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </Link>
        <div className="flex gap-2">
          <QuickEditTransactionForm transaction={row.transaction} />
          <DeleteTransactionDialog id={row.transaction.id}>
            <Button variant="outline" className="text-muted-foreground">
              <Trash />
            </Button>
          </DeleteTransactionDialog>
        </div>
      </CardContent>
    </Card>
  );
}
