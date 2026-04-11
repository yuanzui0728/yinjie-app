import type { SystemStatus } from "@yinjie/contracts";

type DigitalHumanGateway = SystemStatus["digitalHumanGateway"];

export function resolveDigitalHumanGatewayStatusCopy(
  gateway?: DigitalHumanGateway,
) {
  if (!gateway) {
    return null;
  }

  if (gateway.mode === "external_iframe" && !gateway.ready) {
    return {
      statusLabel: "数字人待配置",
      statusHint: gateway.message,
      noticeTone: "warning" as const,
      noticeMessage: gateway.message,
    };
  }

  if (gateway.mode === "external_iframe") {
    return {
      statusLabel: "数字人 Provider 就绪",
      statusHint: gateway.message,
      noticeTone: "info" as const,
      noticeMessage: gateway.message,
    };
  }

  if (gateway.mode === "mock_stage") {
    return {
      statusLabel: "数字人模拟模式",
      statusHint: gateway.message,
      noticeTone: "info" as const,
      noticeMessage: gateway.message,
    };
  }

  return {
    statusLabel: "数字人内置播放器",
    statusHint: gateway.message,
    noticeTone: "info" as const,
    noticeMessage: gateway.message,
  };
}
