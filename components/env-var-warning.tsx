import { Badge } from "./ui/badge";

export function EnvVarWarning() {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Local dev: add Supabase env vars
    </Badge>
  );
}
