import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BarChart3Icon,
  BoxesIcon,
  GithubIcon,
  Gem,
  PlugIcon,
  ReceiptTextIcon,
  RepeatIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagsIcon,
  WalletCardsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { getSession } from "@/features/auth/auth.utils";

const desktopShots = [
  {
    src: "/screenshots/desktop/analytics-1.png",
    alt: "Expenses analytics dashboard",
    label: "Analytics",
  },
  {
    src: "/screenshots/desktop/products-page.png",
    alt: "Product spending list",
    label: "Products",
  },
  {
    src: "/screenshots/desktop/shopping-page.png",
    alt: "Shopping list and planned purchases",
    label: "Shopping",
    wide: true,
  },
  {
    src: "/screenshots/desktop/recurring-page.png",
    alt: "Recurring expenses overview",
    label: "Recurring",
  },
];

const features = [
  {
    icon: ReceiptTextIcon,
    title: "Log purchases fast",
    description:
      "Capture price, product, category, and tags without turning daily spending into admin work.",
  },
  {
    icon: BarChart3Icon,
    title: "See where money goes",
    description:
      "Readable analytics turn transactions into trends, deltas, product breakdowns, and daily activity.",
  },
  {
    icon: RepeatIcon,
    title: "Track recurring costs",
    description:
      "Keep subscriptions and regular bills visible so fixed expenses stop sneaking up on you.",
  },
  {
    icon: ShoppingBagIcon,
    title: "Plan shopping trips",
    description:
      "Build a shopping list, estimate what it will cost, and turn checkout into clean expense data.",
  },
  {
    icon: PlugIcon,
    title: "Import with integrations",
    description:
      "Bring in transaction data from connected sources and keep your personal ledger moving.",
  },
];

const workflow = [
  {
    icon: WalletCardsIcon,
    title: "Daily balance",
    text: "A home screen tuned for quick reads and quick entry.",
  },
  {
    icon: TagsIcon,
    title: "Organized context",
    text: "Products, tags, and categories make every purchase easier to understand later.",
  },
  {
    icon: BoxesIcon,
    title: "Shopping support",
    text: "Plan what to buy, then turn the checkout into clean transactions.",
  },
];

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession();
    return { isLoggedIn: !!session };
  },
  component: LandingPage,
});

function LandingPage() {
  const { isLoggedIn } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  const signIn = () =>
    authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });

  return (
    <div className="min-h-screen overflow-hidden bg-[#090a0b] text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090a0b]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-sm font-semibold text-white"
            aria-label="Expenses home"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[#f3dfbd] text-[#17110a]">
              <Gem className="size-4" />
            </span>
            <span>Expenses</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-white/62 md:flex">
            <a className="transition hover:text-white" href="#features">
              Features
            </a>
            <a className="transition hover:text-white" href="#product">
              Product
            </a>
            <a className="transition hover:text-white" href="#workflow">
              Workflow
            </a>
          </div>

          {isLoggedIn ? (
            <Button asChild size="lg" className="h-10 px-4">
              <Link to="/dashboard">
                Go to dashboard
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="h-10 px-4" onClick={signIn}>
              Get started
              <ArrowRightIcon className="size-4" />
            </Button>
          )}
        </nav>
      </header>

      <main>
        <section className="relative min-h-[92svh] overflow-hidden pt-16">
          <div className="absolute inset-0">
            <img
              src="/screenshots/desktop/home-page.png"
              alt=""
              className="hidden h-full w-full object-cover object-[58%_42%] opacity-70 md:block"
            />
            <img
              src="/screenshots/mobile/home-page.png"
              alt=""
              className="h-full w-full object-cover object-top opacity-62 md:hidden"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#090a0b_0%,rgba(9,10,11,.86)_34%,rgba(9,10,11,.34)_72%,rgba(9,10,11,.78)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(243,223,189,.22),transparent_32%),radial-gradient(circle_at_76%_18%,rgba(43,190,124,.14),transparent_28%)]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#090a0b] to-transparent" />
          </div>

          <div className="relative mx-auto flex min-h-[calc(92svh-4rem)] w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl pt-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-3 py-1 text-xs font-medium text-[#f3dfbd] shadow-2xl shadow-black/40 backdrop-blur">
                <SparklesIcon className="size-3.5" />
                Personal finance that stays personal
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] text-white sm:text-6xl lg:text-7xl">
                Know exactly where your money is going.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Expenses helps you log purchases, organize products, spot
                trends, and keep recurring costs in view from one focused
                dashboard.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                {isLoggedIn ? (
                  <Button asChild size="lg" className="h-12 px-5 text-base">
                    <Link to="/dashboard">
                      Go to dashboard
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-12 px-5 text-base"
                    onClick={signIn}
                  >
                    <GithubIcon className="size-4" />
                    Get started with GitHub
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 border-white/14 bg-white/[.04] px-5 text-base text-white hover:bg-white/[.09]"
                >
                  <a href="#product">See the product</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/62">
                <span className="inline-flex items-center gap-2">
                  <BadgeCheckIcon className="size-4 text-[#5ee098]" />
                  No spreadsheets
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-[#f3dfbd]" />
                  Built for your own data
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-y border-white/10 bg-[#0d0f10] px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[.035] p-5"
              >
                <feature.icon className="size-5 text-[#f3dfbd]" />
                <h2 className="mt-5 text-base font-semibold text-white">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="product"
          className="bg-[#090a0b] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-[#f3dfbd]">
                Product view
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                From quick logging to deep analytics without changing tools.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111315] shadow-2xl shadow-black/50">
                <img
                  src="/screenshots/desktop/analytics-4.png"
                  alt="Expenses analytics charts with KPIs and spending breakdowns"
                  className="h-full min-h-[19rem] w-full object-cover object-top"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {workflow.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-lg border border-white/10 bg-white/[.035] p-5"
                  >
                    <item.icon className="size-5 text-[#5ee098]" />
                    <h3 className="mt-5 text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-white/58">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f1eadf] px-4 py-20 text-[#151412] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-[#785b27]">
                  Showcase
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
                  Every part of spending has a place.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-[#5b554c]">
                  Review products, compare activity, manage recurring expenses,
                  and keep the daily transaction list tidy across desktop and
                  mobile.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm font-medium sm:grid-cols-4">
                {[
                  "Transactions",
                  "Analytics",
                  "Products",
                  "Shopping",
                  "Recurring",
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#d8c7aa] bg-white/55 px-4 py-3"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {desktopShots.map((shot) => (
                <figure
                  key={shot.src}
                  className="overflow-hidden rounded-lg border border-[#d8c7aa] bg-white shadow-xl shadow-[#9b7d4d]/10"
                >
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    className={
                      shot.wide
                        ? "aspect-[1.1] w-full bg-[#090a0b] object-contain"
                        : "aspect-[1.1] w-full object-cover object-top"
                    }
                  />
                  <figcaption className="border-t border-[#eadbc2] px-4 py-3 text-sm font-semibold">
                    {shot.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="bg-[#090a0b] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-[#5ee098]">
                Mobile ready
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
                The same clarity when you are logging expenses on the move.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
                The mobile layout keeps fast entry, transactions, shopping, and
                analytics within reach, so the habit survives outside your desk.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isLoggedIn ? (
                  <Button asChild size="lg" className="h-12 px-5">
                    <Link to="/dashboard">Open dashboard</Link>
                  </Button>
                ) : (
                  <Button size="lg" className="h-12 px-5" onClick={signIn}>
                    Start tracking
                    <ArrowRightIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[23rem] justify-center gap-4 sm:max-w-[34rem] lg:max-w-none lg:justify-end">
              <div className="aspect-[393/852] w-[15rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111315] p-2 shadow-2xl shadow-black/60 sm:w-[16.25rem] lg:w-[15rem]">
                <img
                  src="/screenshots/mobile/home-page.png"
                  alt="Mobile home dashboard for Expenses"
                  className="h-full w-full rounded-[1.5rem] object-cover object-top"
                />
              </div>
              <div className="hidden aspect-[393/852] w-[16.25rem] translate-y-10 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111315] p-2 shadow-2xl shadow-black/60 sm:block lg:w-[15rem]">
                <img
                  src="/screenshots/mobile/transaction-page.png"
                  alt="Mobile transaction detail page for Expenses"
                  className="h-full w-full rounded-[1.5rem] object-cover object-top"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#14110d] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-[#f3dfbd]/18 bg-[#f3dfbd] p-6 text-[#17110a] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Build a cleaner spending habit today.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f4d34]">
                Start with one transaction, then let the dashboard turn your
                everyday purchases into useful context.
              </p>
            </div>
            {isLoggedIn ? (
              <Button
                asChild
                size="lg"
                className="h-12 bg-[#17110a] px-5 text-white hover:bg-[#17110a]/90"
              >
                <Link to="/dashboard">
                  Go to dashboard
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-12 bg-[#17110a] px-5 text-white hover:bg-[#17110a]/90"
                onClick={signIn}
              >
                Get started
                <ArrowRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
