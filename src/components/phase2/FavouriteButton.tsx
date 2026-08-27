import { useState } from "react";
import { toast } from "sonner";
import { personalisationService } from "../../services/personalisationService";
export default function FavouriteButton({
  propertyReference,
  initial = false,
}: {
  propertyReference: string;
  initial?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={busy}
      className="rounded-lg border px-4 py-2"
      onClick={() => {
        const next = !saved;
        setSaved(next);
        setBusy(true);
        void personalisationService
          .setFavourite(propertyReference, next)
          .catch((e: Error) => {
            setSaved(!next);
            toast.error(e.message);
          })
          .finally(() => setBusy(false));
      }}
    >
      {saved ? "♥ Saved" : "♡ Save property"}
    </button>
  );
}
