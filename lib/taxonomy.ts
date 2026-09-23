export const TAGS = [
  { label: "Invitation", value: "invitation" },
  { label: "Threat", value: "threat" },
  { label: "Redirection", value: "redirection" },
  { label: "Pressure", value: "pressure" },
  { label: "Deceptive", value: "deceptive" },
  { label: "Skillful", value: "skillful" },
  { label: "Collaborative", value: "collaborative" },
  { label: "Playful", value: "playful" },
] as const;

export function tagLabel(value: string): string {
  const match = TAGS.find((tag) => tag.value === value);
  return match?.label ?? value;
}
