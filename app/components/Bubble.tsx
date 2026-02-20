/** Get display text from AI SDK 6 UIMessage (uses parts) or legacy content string. */
function getMessageDisplayText(message: {
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
}): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("");
  }
  return "";
}

/** Simple paragraph split for nicer rendering of markdown-style replies. */
function formatContent(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length <= 1) return text;
  return paragraphs.map((p) => p.trim()).join("\n\n");
}

const Bubble = ({
  message,
}: {
  message: { role?: string; content?: string; parts?: Array<{ type?: string; text?: string }> };
}) => {
  const role = message.role ?? "user";
  const raw = getMessageDisplayText(message);
  const content = formatContent(raw);
  const isAssistant = role === "assistant";

  return (
    <div
      className={`${role} bubble`}
      role="article"
      aria-label={isAssistant ? "Assistant message" : "Your message"}
    >
      {content.split("\n\n").map((paragraph, i) =>
        paragraph ? <p key={i}>{paragraph.replace(/\n/g, "\n")}</p> : null
      )}
    </div>
  );
};

export default Bubble;
