export type YandexDiskAuthorizationStart = {
  authorizationUrl: string;
};

export type CompleteYandexDiskOAuthInput = {
  code: string;
  state: string;
};

export type YandexDiskOAuthCompletion = {
  integrationId: string;
  pluginKey: "yandex-disk";
  status: "connected";
  workspaceId: string;
};

export type SelectYandexDiskRootFolderInput = {
  path: string;
};

export type YandexDiskRootFolder = {
  externalResourceId: string;
  name: string;
  path: string;
  providerResourceId: string;
  webUrl: string | null;
};

export const yandexDiskFolderTargetTypes = ["project", "task"] as const;
export type YandexDiskFolderTargetType = (typeof yandexDiskFolderTargetTypes)[number];

export type SelectYandexDiskFolderInput = {
  path: string;
};

export type YandexDiskFolderAssignment = YandexDiskRootFolder & {
  assignmentSource: "managed" | "selected";
  targetId: string;
  targetType: YandexDiskFolderTargetType;
};

export type YandexDiskFolderAssignmentResponse = {
  folder: YandexDiskFolderAssignment | null;
};
