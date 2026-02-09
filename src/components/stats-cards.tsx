import { formatCurrency } from "@/lib/utils";
import { Card } from "./ui/card";

interface StatsCardsProps {
  variableIncome: number;
  fixedIncome: number;
  variableExpenses: number;
  fixedExpenses: number;
}

export function StatsCards({
  variableIncome,
  fixedIncome,
  variableExpenses,
  fixedExpenses,
}: StatsCardsProps) {
  const totalIncome = variableIncome + fixedIncome;
  const totalExpenses = variableExpenses + fixedExpenses;
  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-2">
      {/* Income Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
          <p className="text-[11px] font-medium text-slate-500">Fixed</p>
          <p className="mt-0.5 text-base font-bold text-emerald-400">
            {formatCurrency(fixedIncome)}
          </p>
        </Card>

        <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
          <p className="text-[11px] font-medium text-slate-500">Variable</p>
          <p className="mt-0.5 text-base font-bold text-emerald-400">
            {formatCurrency(variableIncome)}
          </p>
        </Card>

        <Card className="p-3 text-center border-[#1e1e2e] bg-emerald-500/10">
          <p className="text-[11px] font-medium text-emerald-400/70">Total Income</p>
          <p className="mt-0.5 text-base font-bold text-emerald-400">
            {formatCurrency(totalIncome)}
          </p>
        </Card>
      </div>

      {/* Expenses Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
          <p className="text-[11px] font-medium text-slate-500">Fixed</p>
          <p className="mt-0.5 text-base font-bold text-red-400">
            {formatCurrency(fixedExpenses)}
          </p>
        </Card>

        <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
          <p className="text-[11px] font-medium text-slate-500">Variable</p>
          <p className="mt-0.5 text-base font-bold text-red-400">
            {formatCurrency(variableExpenses)}
          </p>
        </Card>

        <Card className="p-3 text-center border-[#1e1e2e] bg-red-500/10">
          <p className="text-[11px] font-medium text-red-400/70">Total Expenses</p>
          <p className="mt-0.5 text-base font-bold text-red-400">
            {formatCurrency(totalExpenses)}
          </p>
        </Card>
      </div>

      {/* Balance Row */}
      <Card
        className={`p-4 text-center border-[#1e1e2e] ${
          balance >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}
      >
        <p
          className={`text-[11px] font-medium ${
            balance >= 0 ? "text-emerald-400/70" : "text-red-400/70"
          }`}
        >
          Balance
        </p>
        <p
          className={`mt-0.5 text-xl font-bold ${
            balance >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {formatCurrency(balance)}
        </p>
      </Card>
    </div>
  );
}
