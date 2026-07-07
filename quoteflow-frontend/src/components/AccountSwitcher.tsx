import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { TENANTS, CURRENT_USER } from "@/lib/tenants";
import { useRfqStore } from "@/lib/rfq-store";

export function AccountSwitcher() {
  const currentTenantId = useRfqStore((s) => s.currentTenantId);
  const setTenant = useRfqStore((s) => s.setTenant);
  const current = TENANTS.find((t) => t.id === currentTenantId) ?? TENANTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 pl-1.5">
          <span
            className="grid h-6 w-6 place-items-center rounded text-[10px] font-semibold text-white"
            style={{ backgroundColor: current.color }}
          >
            {current.initials}
          </span>
          <span className="max-w-[140px] truncate">{current.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-xs font-normal text-muted-foreground">Signed in as</span>
          <span className="text-sm font-medium">{CURRENT_USER.name}</span>
          <span className="text-xs font-normal text-muted-foreground">{CURRENT_USER.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Switch account
        </DropdownMenuLabel>
        {TENANTS.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTenant(t.id)}
            className="flex items-center gap-2"
          >
            <span
              className="grid h-6 w-6 place-items-center rounded text-[10px] font-semibold text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.initials}
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-sm">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.industry}</span>
            </div>
            {t.id === current.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
