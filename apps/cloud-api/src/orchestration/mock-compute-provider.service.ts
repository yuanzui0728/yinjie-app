import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CloudInstanceEntity } from "../entities/cloud-instance.entity";
import { CloudWorldEntity } from "../entities/cloud-world.entity";

type ProvisionedInstance = {
  providerKey: string;
  providerInstanceId: string;
  region: string;
  zone: string;
  privateIp: string;
  publicIp: string | null;
  apiBaseUrl: string;
  adminUrl: string | null;
};

@Injectable()
export class MockComputeProviderService {
  createInstance(world: CloudWorldEntity): ProvisionedInstance {
    return {
      providerKey: "mock",
      providerInstanceId: `mock-instance-${randomUUID()}`,
      region: world.providerRegion ?? "mock-local",
      zone: world.providerZone ?? "mock-a",
      privateIp: "127.0.0.1",
      publicIp: null,
      apiBaseUrl: this.resolveApiBaseUrl(),
      adminUrl: null,
    };
  }

  startInstance(instance: CloudInstanceEntity) {
    return {
      ...instance,
      powerState: "running",
    };
  }

  stopInstance(instance: CloudInstanceEntity) {
    return {
      ...instance,
      powerState: "stopped",
    };
  }

  resolveApiBaseUrl() {
    const configured = process.env.CLOUD_MOCK_WORLD_API_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/+$/, "");
    }

    return "http://localhost:3000";
  }
}
