"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAccount } from "@/app/actions/manage-snippets";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

/** Delete-account control: the user types their username to confirm. */
export function DeleteAccount({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteAccount();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Your account and all its data were deleted.");
      router.push("/");
      router.refresh();
    });

  return (
    <>
      <Button className="min-h-11 sm:min-h-10" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setTyped("");
        }}
        title="Delete your account?"
        description="This deletes your account, your profile and every snippet you published, with their images, reactions and comments, plus the comments, reactions and view records you left on other snippets. Connected assistants lose access. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || typed.trim() !== username} onClick={confirm}>
              {pending ? <Spinner /> : null}
              Delete my account
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 pb-1">
          <Label htmlFor="confirm-username" className="block leading-normal">
            Type <span className="font-mono break-all">{username}</span> to confirm
          </Label>
          <Input
            id="confirm-username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      </ResponsiveModal>
    </>
  );
}
