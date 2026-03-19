import { transactionMutations } from "@/features/transactions/transaction.mutations";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_app/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [product, setProduct] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = transactionMutations.addTransaction();

  function handleTransaction(type: "income" | "expense") {
    if (!validate()) {
      return;
    }

    mutation.mutate(
      {
        itemName: product,
        description: desc,
        price: Number(price),
        type,
        source: "manual",
      },
      {
        onSuccess: () => {
          setProduct("");
          setDesc("");
          setPrice("");
        },
      },
    );
  }

  function validate() {
    setError(null);

    if (product.length < 1) {
      setError("Product must be 1 char");
      return false;
    }

    if (price.length < 1) {
      setError("Must enter a price");
      return false;
    }

    const num = Number(price);
    if (Number.isNaN(num)) {
      setError("Must be a valid number for price");
      return;
    }

    return true;
  }

  return (
    <div>
      <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
        <input
          type="string"
          placeholder="product..."
          className="border"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
        <input
          type="string"
          placeholder="description..."
          className="border"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <input
          type="string"
          placeholder="price..."
          className="border"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {error && <p>{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="grow"
            onClick={() => handleTransaction("expense")}
          >
            Expense
          </button>
          <button
            type="submit"
            className="grow"
            onClick={() => handleTransaction("income")}
          >
            Income
          </button>
        </div>
      </form>
    </div>
  );
}
