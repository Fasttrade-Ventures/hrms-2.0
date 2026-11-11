"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

type EmployeeOption = {
  id: string;
  full_name: string;
  employee_number: string;
};

function employeeLabel(employee: EmployeeOption) {
  return `${employee.full_name} (${employee.employee_number})`;
}

export function EmployeeSearchSelect({ employees }: { employees: EmployeeOption[] }) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const selected = employees.find((employee) => employee.id === selectedId);
    const needle = query.trim().toLowerCase();
    if (!needle || (selected && query === employeeLabel(selected))) return employees;
    return employees.filter((employee) =>
      `${employee.full_name} ${employee.employee_number}`.toLowerCase().includes(needle),
    );
  }, [employees, query, selectedId]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function markInvalid() {
    inputRef.current?.setCustomValidity("Choose an employee from the list.");
  }

  function markValid() {
    inputRef.current?.setCustomValidity("");
  }

  function choose(employee: EmployeeOption) {
    setSelectedId(employee.id);
    setQuery(employeeLabel(employee));
    setOpen(false);
    markValid();
  }

  const activeId = open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined;

  return (
    <div
      className="relative"
      onPointerDown={() => setOpen(true)}
      ref={rootRef}
    >
      <input name="employeeId" type="hidden" value={selectedId} />
      <input
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        autoComplete="off"
        className="h-10 w-full min-w-0 rounded-lg border border-input bg-[var(--surface-card)] px-3.5 pr-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        id="employeeId"
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedId("");
          setActiveIndex(0);
          setOpen(true);
          markInvalid();
        }}
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const employee = matches[activeIndex];
            if (employee) choose(employee);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search name or employee number"
        ref={inputRef}
        required
        role="combobox"
        value={query}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      {open ? (
        <ul
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-input bg-[var(--surface-card)] py-1 shadow-md"
          id={listId}
          role="listbox"
        >
          {matches.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-muted-foreground">No matching staff</li>
          ) : (
            matches.map((employee, index) => {
              const selected = employee.id === selectedId;
              return (
                <li key={employee.id} role="presentation">
                  <button
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-baseline justify-between gap-3 px-3.5 py-2 text-left text-sm",
                      index === activeIndex || selected ? "bg-muted" : "hover:bg-muted",
                    )}
                    id={`${listId}-${employee.id}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(employee);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="min-w-0 truncate text-foreground">{employee.full_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{employee.employee_number}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
