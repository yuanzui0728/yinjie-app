import { getSystemStatus } from "@yinjie/contracts";

export async function assertWorldReachable(baseUrl: string) {
  const status = await getSystemStatus(baseUrl);
  if (!status.coreApi.healthy) {
    throw new Error(status.coreApi.message?.trim() || "当前世界实例暂时不可用，请稍后再试。");
  }

  return status;
}
