"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function buildListHref(params: {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/hr/apply-behalf?${qs}` : "/hr/apply-behalf";
}

export function ApplyBehalfFilters({
  type,
  dateFrom,
  dateTo,
}: {
  type: "all" | "leave" | "late";
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const hasFilters = Boolean(dateFrom || dateTo || type !== "all");

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <ToggleGroup
            onValueChange={(values) => {
              const next = values.at(-1) as "all" | "leave" | "late" | undefined;
              if (!next || next === type) return;
              router.push(buildListHref({ type: next, dateFrom, dateTo, page: 1 }));
            }}
            spacing={0}
            value={[type]}
            variant="outline"
          >
            <ToggleGroupItem aria-label="All applications" value="all">
              All
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Leave applications" value="leave">
              Leave
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Late applications" value="late">
              Late
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator className="hidden lg:block lg:h-10" orientation="vertical" />

        <form
          action="/hr/apply-behalf"
          className="flex flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          method="get"
        >
          <input name="type" type="hidden" value={type} />
          <div className="flex min-w-[10rem] flex-1 flex-col gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor="dateFrom">
              Applied from
            </Label>
            <Input
              defaultValue={dateFrom ?? ""}
              id="dateFrom"
              name="dateFrom"
              type="date"
            />
          </div>
          <div className="flex min-w-[10rem] flex-1 flex-col gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor="dateTo">
              Applied to
            </Label>
            <Input defaultValue={dateTo ?? ""} id="dateTo" name="dateTo" type="date" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" type="submit">
              Filter
            </Button>
            {hasFilters ? (
              <Button render={<Link href="/hr/apply-behalf" />} size="sm" variant="outline">
                Clear
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
