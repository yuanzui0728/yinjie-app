import type { WorldAccessPhase, WorldAccessSessionStatus } from "@yinjie/contracts";
import type { CloudWorldEntity } from "../entities/cloud-world.entity";

export type WorldAccessSnapshot = {
  status: WorldAccessSessionStatus;
  phase: WorldAccessPhase;
  displayStatus: string;
  resolvedApiBaseUrl: string | null;
  retryAfterSeconds: number;
  estimatedWaitSeconds: number | null;
  failureReason: string | null;
};

export function buildWorldAccessSnapshot(
  world: Pick<CloudWorldEntity, "status" | "apiBaseUrl" | "failureMessage" | "healthMessage">,
): WorldAccessSnapshot {
  switch (world.status) {
    case "active":
    case "ready":
      if (!world.apiBaseUrl) {
        return {
          status: "failed",
          phase: "failed",
          displayStatus: "世界暂时不可用",
          resolvedApiBaseUrl: null,
          retryAfterSeconds: 0,
          estimatedWaitSeconds: null,
          failureReason: "世界入口地址尚未配置，请稍后再试。",
        };
      }

      return {
        status: "ready",
        phase: "ready",
        displayStatus: "世界已准备好",
        resolvedApiBaseUrl: world.apiBaseUrl,
        retryAfterSeconds: 0,
        estimatedWaitSeconds: 0,
        failureReason: null,
      };
    case "starting":
    case "sleeping":
    case "stopping":
      return {
        status: "waiting",
        phase: "starting",
        displayStatus: "正在唤起你之前的世界",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 2,
        estimatedWaitSeconds: 12,
        failureReason: null,
      };
    case "rejected":
    case "failed":
      return {
        status: "failed",
        phase: "failed",
        displayStatus: "世界暂时不可用",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 0,
        estimatedWaitSeconds: null,
        failureReason: world.failureMessage ?? world.healthMessage ?? "世界创建或唤起失败，请稍后重试。",
      };
    case "disabled":
      return {
        status: "disabled",
        phase: "disabled",
        displayStatus: "世界当前不可用",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 0,
        estimatedWaitSeconds: null,
        failureReason: world.failureMessage ?? "这个世界当前已被停用。",
      };
    case "deleting":
      return {
        status: "failed",
        phase: "failed",
        displayStatus: "世界正在维护中",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 0,
        estimatedWaitSeconds: null,
        failureReason: "这个世界正在维护中，请稍后再试。",
      };
    case "provisioning":
    case "bootstrapping":
      return {
        status: "waiting",
        phase: "creating",
        displayStatus: "正在为你创建世界",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 2,
        estimatedWaitSeconds: 10,
        failureReason: null,
      };
    case "pending":
    case "queued":
    case "creating":
    default:
      return {
        status: "waiting",
        phase: "creating",
        displayStatus: "正在为你创建世界",
        resolvedApiBaseUrl: null,
        retryAfterSeconds: 2,
        estimatedWaitSeconds: 20,
        failureReason: null,
      };
  }
}
