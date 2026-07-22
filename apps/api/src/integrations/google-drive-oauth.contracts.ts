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
