export type GoogleDriveAuthorizationStart = {
  authorizationUrl: string;
};

export type CompleteGoogleDriveOAuthInput = {
  code: string;
  state: string;
};

export type GoogleDriveOAuthCompletion = {
  integrationId: string;
  pluginKey: "google-drive";
  status: "connected";
  workspaceId: string;
};

export type GoogleDrivePickerSession = {
  accessToken: string;
  appId: string;
  developerKey: string;
  expiresAt: Date;
};

export type SelectGoogleDriveRootFolderInput = {
  folderId: string;
};

export type GoogleDriveRootFolder = {
  externalResourceId: string;
  name: string;
  providerResourceId: string;
  webUrl: string | null;
};

export const googleDriveFolderTargetTypes = ["project", "task"] as const;
export type GoogleDriveFolderTargetType = (typeof googleDriveFolderTargetTypes)[number];

export type SelectGoogleDriveFolderInput = {
  folderId: string;
};

export type GoogleDriveFolderAssignment = GoogleDriveRootFolder & {
  assignmentSource: "managed" | "selected";
  targetId: string;
  targetType: GoogleDriveFolderTargetType;
};

export type GoogleDriveFolderAssignmentResponse = {
  folder: GoogleDriveFolderAssignment | null;
};
