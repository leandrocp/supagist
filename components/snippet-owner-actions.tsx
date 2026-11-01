"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSnippet, updateSnippet, type SnippetEdit } from "@/app/actions/manage-snippets";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { play } from "@/lib/motion";

/** The snippet on screen: its card in a list, or the canvas on its own page. */
function snippetSurface(snippetId: string): Element | null {
  return (
    document.querySelector(`[data-snippet-card="${snippetId}"]`) ??
    document.querySelector('[data-testid="snippet-canvas"]') ??
    document.querySelector('[data-testid="snippet-card"]')
  );
}

type Props = {
  snippetId: string;
  /** Shown in the delete confirmation, e.g. the title or filename. */
  name: string;
  /** "buttons" on the snippet page; a compact "…" menu on list cards. */
  variant: "buttons" | "menu";
  /** Where to go after deleting: the snippet page leaves; a list just refreshes. */
  afterDelete: "snippets" | "refresh";
};

/** Owner-only Edit and Delete controls. The server action and RLS enforce ownership. */
export function SnippetOwnerActions({ snippetId, name, variant, afterDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      {variant === "buttons" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => setEditing(true)}
          >
            <Pencil /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => setDeleting(true)}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 bg-background/80 backdrop-blur-sm"
              aria-label={`Actions for ${name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex gap-2" onSelect={() => setEditing(true)}>
              <Pencil className="text-muted-foreground" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex gap-2" onSelect={() => setDeleting(true)}>
              <Trash2 className="text-muted-foreground" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {editing ? (
        <EditSnippetModal snippetId={snippetId} onClose={() => setEditing(false)} />
      ) : null}
      {deleting ? (
        <DeleteSnippetModal
          onClose={() => setDeleting(false)}
          snippetId={snippetId}
          name={name}
          afterDelete={afterDelete}
        />
      ) : null}
    </>
  );
}

function DeleteSnippetModal({
  onClose,
  snippetId,
  name,
  afterDelete,
}: {
  onClose: () => void;
  snippetId: string;
  name: string;
  afterDelete: Props["afterDelete"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteSnippet(snippetId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onClose();
      toast.success("Snippet deleted.");
      // A playful but clear exit: the card tips over and drops away. The
      // snippet page navigates at once; a list waits for the exit (≈ 0.4 s)
      // so the card doesn't blink back before the refresh removes it.
      const exit = play(
        snippetSurface(snippetId),
        [
          { transform: "none", opacity: 1 },
          {
            transform: "translate3d(0, -6px, 0) rotate(-2deg) scale(1.02)",
            opacity: 1,
            offset: 0.25,
          },
          { transform: "translate3d(0, 48px, 0) rotate(7deg) scale(0.85)", opacity: 0 },
        ],
        { duration: 420, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" },
      );
      if (afterDelete === "snippets") router.push("/snippets");
      else if (exit) await exit.finished.catch(() => undefined);
      router.refresh();
    });

  return (
    <ResponsiveModal
      open
      onOpenChange={(next) => !next && !pending && onClose()}
      title="Delete this snippet?"
      description={
        <>
          <span className="font-medium text-foreground">{name}</span> will be deleted for good, with
          its images, reactions and comments. Its link will stop working. This cannot be undone.
        </>
      }
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={confirm}>
            {pending ? <Spinner /> : null}
            Delete snippet
          </Button>
        </>
      }
    />
  );
}

const visibilities = [
  { id: "public", label: "Public", hint: "Anyone can find it." },
  { id: "unlisted", label: "Unlisted", hint: "Only people with the link can open it." },
] as const;

function EditSnippetModal({ snippetId, onClose }: { snippetId: string; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SnippetEdit & { filename: string }>();
  const [loadError, setLoadError] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load the current version when the modal opens, so list cards don't have
  // to carry every snippet's details.
  useEffect(() => {
    void createClient()
      .from("snippets")
      .select("title, filename, visibility")
      .eq("id", snippetId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return setLoadError(true);
        setDraft({ title: data.title ?? "", filename: data.filename, visibility: data.visibility });
      });
  }, [snippetId]);

  const save = () =>
    startTransition(async () => {
      if (!draft) return;
      const { filename: _filename, ...edit } = draft;
      const result = await updateSnippet(snippetId, edit);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onClose();
      toast.success("Changes saved.");
      router.refresh();
      // A small confirmation on the snippet itself: it settles back in.
      play(
        snippetSurface(snippetId),
        [
          { transform: "scale(0.985)" },
          { transform: "scale(1.006)", offset: 0.6 },
          { transform: "none" },
        ],
        { duration: 460, easing: "ease-out", delay: 120 },
      );
    });

  return (
    <ResponsiveModal
      open
      onOpenChange={(next) => !next && !pending && onClose()}
      title="Edit snippet"
      description="The code is sealed once published. To change it, delete this snippet and publish it again."
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!draft || pending} onClick={save}>
            {pending ? <Spinner /> : null}
            Save changes
          </Button>
        </>
      }
    >
      {loadError ? (
        <p className="text-sm text-muted-foreground">
          Could not load this snippet. Close and try again.
        </p>
      ) : !draft ? (
        <div className="flex items-center justify-center py-10">
          <Spinner className="size-5" />
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-4 pb-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={draft.title}
              maxLength={120}
              placeholder={draft.filename}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label id="edit-visibility">Visibility</Label>
            <Select
              value={draft.visibility}
              onValueChange={(visibility) =>
                setDraft({ ...draft, visibility: visibility as SnippetEdit["visibility"] })
              }
            >
              <SelectTrigger aria-labelledby="edit-visibility" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {visibilities.map(({ id, label, hint }) => (
                  <SelectItem key={id} value={id}>
                    {label} <span className="text-muted-foreground">· {hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </ResponsiveModal>
  );
}
