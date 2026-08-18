import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function HrField({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[13px] text-foreground" htmlFor={id}>
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const selectClassName =
  "h-10 w-full rounded-lg border border-input bg-muted/40 px-3.5 text-base md:text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function HrTextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={cn("h-10 bg-muted/40 text-base md:text-sm", className)} {...props} />;
}

export function HrSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={selectClassName} {...props} />;
}

export function HrTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-lg border border-input bg-muted/40 px-3.5 py-2.5 text-base md:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export function HrCheckbox({
  id,
  label,
  defaultChecked,
  name,
  value,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
  name?: string;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-muted-foreground" htmlFor={id}>
      <input
        className="size-4 accent-primary"
        defaultChecked={defaultChecked}
        id={id}
        name={name}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}

export function HrPrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={className} type="button" {...props}>
      {children}
    </Button>
  );
}

export function HrGhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={className} type="button" variant="outline" {...props}>
      {children}
    </Button>
  );
}

export function HrFormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) {
    return null;
  }

  return (
    <Card
      className={cn(
        "py-3",
        error ? "border-destructive/40 bg-destructive/10" : "border-primary/30 bg-accent",
      )}
      size="sm"
    >
      <CardContent className="py-0 text-sm text-foreground">{error ?? success}</CardContent>
    </Card>
  );
}
