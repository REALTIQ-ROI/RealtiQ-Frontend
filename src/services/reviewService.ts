import api from "../lib/axios";
export interface CreateReviewInput {
  landlord: string;
  property: string;
  transaction: string;
  rating: number;
  comment?: string;
}
export interface PropertyReview {
  _id: string;
  landlord: string;
  property: string;
  transaction: string;
  rating: number;
  comment?: string;
  createdAt: string;
}
export const reviewService = {
  async create(input: CreateReviewInput) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
      throw new Error("Rating must be a whole number from 1 to 5.");
    const comment = input.comment?.trim();
    const { data } = await api.post<
      { review: PropertyReview } | PropertyReview
    >("/reviews", {
      ...input,
      ...(comment ? { comment } : { comment: undefined }),
    });
    return "review" in data ? data.review : data;
  },
};
