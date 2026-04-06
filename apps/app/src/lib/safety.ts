export function promptForSafetyReason(actionLabel: string) {
  const value = window.prompt(`${actionLabel}\n请输入原因，便于后续追踪处理：`, "骚扰或不适内容");
  const normalized = value?.trim();
  return normalized || null;
}
