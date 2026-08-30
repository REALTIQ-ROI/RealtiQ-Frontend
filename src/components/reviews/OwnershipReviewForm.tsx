import { useState } from "react";
import { toast } from "sonner";
import { ApiRequestError } from "../../lib/axios";
import type { OwnershipRecord } from "../../services/ownershipService";
import { reviewService } from "../../services/reviewService";

export default function OwnershipReviewForm({
  ownership,
  onSuccess,
}: {
  ownership: OwnershipRecord;
  onSuccess: () => void | Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const property =
    typeof ownership.property === "object" ? ownership.property : undefined;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const landlord = property?.owner?.id;
    if (pending || !landlord || !property?._id || !ownership.payment?._id)
      return;
    setPending(true);
    try {
      await reviewService.create({
        landlord,
        property: property._id,
        transaction: ownership.payment._id,
        rating,
        ...(comment.trim() ? { comment } : {}),
      });
      toast.success(
        "Review submitted. Seller rating and trust information will refresh from RealtIQ.",
      );
      await onSuccess();
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.status === 409) {
        toast.info("This purchase has already been reviewed.");
        await onSuccess();
      } else
        toast.error(
          raw instanceof ApiRequestError && raw.status === 429
            ? "Too many attempts. Please wait and try again."
            : raw instanceof Error
              ? raw.message
              : "Unable to submit review.",
        );
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className={"mt-3 space-y-3"}>
      <label className={"block text-sm font-bold"}>
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className={"mt-1 w-full rounded-lg border p-2"}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <label className={"block text-sm font-bold"}>
        Comment (optional)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          className={"mt-1 w-full rounded-lg border p-2"}
        />
      </label>
      <button
        disabled={pending}
        className={
          "rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-60"
        }
      >
        {pending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
