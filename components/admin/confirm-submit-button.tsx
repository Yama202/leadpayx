"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
}: {
  children: string;
  message: string;
}) {
  return (
    <Button
      className="min-h-11 cursor-pointer"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
      variant="secondary"
    >
      {children}
    </Button>
  );
}
