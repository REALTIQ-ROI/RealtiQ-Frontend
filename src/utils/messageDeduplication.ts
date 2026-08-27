import type { MarketplaceMessage } from '../types';

const senderId = (message: MarketplaceMessage) =>
  typeof message.sender === 'string' ? message.sender : message.sender._id;

const retrySignature = (message: MarketplaceMessage) =>
  JSON.stringify({
    sender: senderId(message),
    text: message.text.trim(),
    attachments: message.attachments.map(({ mimeType, originalFileName, fileSizeBytes }) => ({
      mimeType,
      originalFileName,
      fileSizeBytes,
    })),
    moderated: Boolean(message.moderated),
  });

// Removes historical pairs created by the former 12-second socket-to-REST fallback.
// Persisted messages outside this narrow retry window remain distinct.
export const removeAccidentalRetryDuplicates = (messages: MarketplaceMessage[]) => {
  const ordered = [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  return ordered.filter((message, index) => {
    const previous = ordered[index - 1];
    if (!previous || retrySignature(previous) !== retrySignature(message)) return true;
    const delay = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime();
    return delay < 0 || delay > 15_000;
  });
};
