import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import Link from "next/link";

export function SiteHeader() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/todos", label: "Todos" },
    {
      to: "https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard",
      label: "GitHub",
    },
  ];
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Documents</h1>
        <div className="ml-auto flex items-center gap-2">
          {links.map(({ to, label }) => {
            return (
              <Button
                key={label}
                variant="ghost"
                asChild
                size="sm"
                className="hidden sm:flex"
              >
                <Link key={to} href={to}>
                  {label}
                </Link>
              </Button>
            );
          })}
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
