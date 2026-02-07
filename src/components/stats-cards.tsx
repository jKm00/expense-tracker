import { formatCurrency } from "@/lib/utils";
import { Card } from "./ui/card";

interface StatsCardsProps {
  totalIncome: number;
  variableExpenses: number;
  fixedExpenses: number;
}

export function StatsCards({
  totalIncome,
  variableExpenses,
  fixedExpenses,
}: StatsCardsProps) {
  const netBalance = totalIncome - variableExpenses - fixedExpenses;

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Row 1: Income, Variable, Fixed */}
      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Income</p>
        <p className="mt-0.5 text-base font-bold text-emerald-400">
          {formatCurrency(totalIncome)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Variable</p>
        <p className="mt-0.5 text-base font-bold text-red-400">
          {formatCurrency(variableExpenses)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Fixed</p>
        <p className="mt-0.5 text-base font-bold text-indigo-400">
          {formatCurrency(fixedExpenses)}
        </p>
      </Card>

      {/* Row 2: Balance (full width) */}
      <Card className="col-span-3 p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Balance</p>
        <p
          className={`mt-0.5 text-xl font-bold ${
            netBalance >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {formatCurrency(netBalance)}
        </p>
      </Card>
    </div>
  );
}
