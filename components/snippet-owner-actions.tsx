"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { availableLanguages, availableThemes } from "@lumis-sh/lumis/client";
import { deleteSnippet, updateSnippet, type SnippetEdit } from "@/app/actions/manage-snippets";
import { ResponsiveModal } from "@/components/responsive-modal";
import { ThemePicker } from "@/components/theme-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { BRAND_THEMES } from "@/lib/brand-themes";
import { createClient } from "@/lib/supabase/client";
import { codePointLength, normalizeSnippetCode } from "@/lib/snippet-utils";

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
      if (afterDelete === "snippets") router.push("/snippets");
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
  const themes = useMemo(
    () => [
      ...BRAND_THEMES.map((t) => ({ id: t.id, label: t.name })),
      ...availableThemes().map((t) => ({ id: t.name, label: t.name })),
    ],
    [],
  );
  const languages = useMemo(() => availableLanguages().map((l) => l.id), []);

  // Load the current version when the modal opens, so list cards don't have
  // to carry every snippet's code.
  useEffect(() => {
    void createClient()
      .from("snippets")
      .select("code, title, filename, language, theme, visibility")
      .eq("id", snippetId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return setLoadError(true);
        setDraft({
          code: data.code,
          title: data.title ?? "",
          filename: data.filename,
          language: data.language ?? "plaintext",
          theme: data.theme,
          visibility: data.visibility,
        });
      });
  }, [snippetId]);

  const length = draft ? codePointLength(normalizeSnippetCode(draft.code)) : 0;
  const tooLong = length > 8000;

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
    });

  return (
    <ResponsiveModal
      open
      onOpenChange={(next) => !next && !pending && onClose()}
      title="Edit snippet"
      description="Changes show up at the same link right away."
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!draft || pending || tooLong || length === 0} onClick={save}>
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
            <Label htmlFor="edit-code">Code</Label>
            <Textarea
              id="edit-code"
              value={draft.code}
              spellCheck={false}
              aria-invalid={tooLong || length === 0}
              className="max-h-[40dvh] min-h-40 font-mono text-[13px] leading-5"
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            />
            <span
              className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
            >
              {length.toLocaleString()} / 8,000 characters
            </span>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <Label id="edit-language">Language</Label>
              <Select
                value={draft.language}
                onValueChange={(language) => setDraft({ ...draft, language })}
              >
                <SelectTrigger aria-labelledby="edit-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {languages.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label>Theme</Label>
              <ThemePicker
                value={draft.theme}
                themes={themes}
                onChange={(theme) => setDraft({ ...draft, theme })}
                triggerClassName="h-11 w-full rounded-xl bg-surf2 px-3.5 text-[15px] hover:bg-surf3 focus-visible:focus-ring"
              />
            </div>
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
