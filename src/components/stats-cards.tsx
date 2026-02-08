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
  const netBalance = totalIncome - variableExpenses - fixedExpenses;

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Row 1: Income Cards */}
      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Fixed Inc.</p>
        <p className="mt-0.5 text-base font-bold text-emerald-400">
          {formatCurrency(fixedIncome)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Variable Inc.</p>
        <p className="mt-0.5 text-base font-bold text-emerald-400">
          {formatCurrency(variableIncome)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Total Income</p>
        <p className="mt-0.5 text-base font-bold text-emerald-400">
          {formatCurrency(totalIncome)}
        </p>
      </Card>

      {/* Row 2: Expenses + Balance */}
      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Variable Exp.</p>
        <p className="mt-0.5 text-base font-bold text-red-400">
          {formatCurrency(variableExpenses)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Fixed Exp.</p>
        <p className="mt-0.5 text-base font-bold text-red-400">
          {formatCurrency(fixedExpenses)}
        </p>
      </Card>

      <Card className="p-3 text-center border-[#1e1e2e] bg-[#12121a]">
        <p className="text-[11px] font-medium text-slate-500">Balance</p>
        <p
          className={`mt-0.5 text-base font-bold ${
            netBalance >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {formatCurrency(netBalance)}
        </p>
      </Card>
    </div>
  );
}
