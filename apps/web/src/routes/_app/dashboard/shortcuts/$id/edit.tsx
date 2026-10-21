import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { productQueries } from "@/features/products/products.queries";
import { ShortcutForm } from "@/features/shortcuts/components/shortcut.form";
import { shortcutQueries } from "@/features/shortcuts/shortcuts.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shortcuts/$id/edit")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        shortcutQueries.getShortcutOptions(params.id),
      ),
      context.queryClient.ensureQueryData(productQueries.getProductsOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Shortcut</PageHeaderTitle>
        <PageHeaderDescription>Modify shortcut details</PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <EditShortcutContent />
      </Suspense>
    </div>
  );
}

function EditShortcutContent() {
  const { id } = Route.useParams();
  const {
    data: [expectedError, shortcut],
    error: unexpectedError,
  } = useSuspenseQuery(shortcutQueries.getShortcutOptions(id));

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;
    const reason = expectedError.reason;
    switch (reason) {
      case "SHORTCUT_NOT_FOUND":
        title = "Shortcut not found";
        message = "The shortcut you are trying to edit does not exist.";
        break;
      case "SHORTCUT_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the shortcut. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return <ShortcutForm key={shortcut.id} shortcut={shortcut} />;
}
