// Helper function to get audience label from recipientMode
export const getAudienceLabel = (recipientMode, selectedUserIds = []) => {
  if (recipientMode === "active") return "Active Users Only";
  if (recipientMode === "all") return "All Users";
  if (recipientMode === "custom") {
    const n = [...new Set((selectedUserIds || []).map((id) => String(id).trim()).filter(Boolean))]
      .length;
    return `Custom Selection (${n} user${n === 1 ? "" : "s"})`;
  }
  return "All Users";
};
