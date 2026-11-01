export function speakerLabel(message: string) {
  const labels = new Set(
    [...message.matchAll(/<([A-Za-z][A-Za-z0-9_]*)>/g)].map((t) => t[1]),
  );
  const outside = message
    .replace(/<([A-Za-z][A-Za-z0-9_]*)>[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  if (outside) labels.add("default");
  return labels.size > 1 ? "cast" : [...labels][0] || "default";
}
