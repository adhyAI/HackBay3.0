import { Link } from "@tanstack/react-router";
import { AccountSwitcher } from "./AccountSwitcher";
import { Boxes } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
            <Boxes className="h-4 w-4" />
          </div>
          Quotsy
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            to="/dashboard"
            className="rounded-md px-2.5 py-1.5 hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground" }}
          >
            Pipeline
          </Link>
          <Link
            to="/profile"
            className="rounded-md px-2.5 py-1.5 hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground" }}
          >
            Profile
          </Link>
        </nav>
        <div className="ml-auto">
          <AccountSwitcher />
        </div>
      </div>
    </header>
  );
}
