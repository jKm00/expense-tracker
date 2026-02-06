import { Header } from "@/components/header";
import { TransactionForm } from "@/components/transaction-form";
import { RecentTransactions } from "@/components/recent-transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCategories } from "@/actions/categories";
import { getRecentTransactions } from "@/actions/transactions";

export default async function Home() {
  const [categories, recentTransactions] = await Promise.all([
    getCategories(),
    getRecentTransactions(5),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Transaction Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm categories={categories} />
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentTransactions} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
