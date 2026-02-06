import { formatCurrency } from "@/lib/utils";
import { Card } from "./ui/card";

interface StatsCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export function StatsCards({
  totalIncome,
  totalExpenses,
  netBalance,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-3 text-center">
        <p className="text-xs font-medium text-gray-500">Income</p>
        <p className="mt-1 text-lg font-bold text-emerald-600">
          {formatCurrency(totalIncome)}
        </p>
      </Card>

      <Card className="p-3 text-center">
        <p className="text-xs font-medium text-gray-500">Expenses</p>
        <p className="mt-1 text-lg font-bold text-red-600">
          {formatCurrency(totalExpenses)}
        </p>
      </Card>

      <Card className="p-3 text-center">
        <p className="text-xs font-medium text-gray-500">Balance</p>
        <p
          className={`mt-1 text-lg font-bold ${
            netBalance >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {formatCurrency(netBalance)}
        </p>
      </Card>
    </div>
  );
}
