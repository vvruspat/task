import type { GoogleDrivePickerSession } from "@task/api-client";

const pickerScriptId = "task-google-picker-api";
const pickerScriptUrl = "https://apis.google.com/js/api.js";
let pickerApiPromise: Promise<GooglePickerApi> | null = null;

type GooglePickerSelection =
  | { kind: "cancelled" }
  | { kind: "pending" }
  | { folderId: string; kind: "picked" };

type GooglePicker = {
  setVisible(visible: boolean): void;
};

type GooglePickerDocsView = {
  setEnableDrives(enabled: boolean): GooglePickerDocsView;
  setIncludeFolders(enabled: boolean): GooglePickerDocsView;
  setSelectFolderEnabled(enabled: boolean): GooglePickerDocsView;
};

type GooglePickerBuilder = {
  addView(view: GooglePickerDocsView): GooglePickerBuilder;
  build(): GooglePicker;
  enableFeature(feature: string): GooglePickerBuilder;
  setAppId(appId: string): GooglePickerBuilder;
  setCallback(callback: (value: unknown) => void): GooglePickerBuilder;
  setDeveloperKey(developerKey: string): GooglePickerBuilder;
  setMaxItems(maxItems: number): GooglePickerBuilder;
  setOAuthToken(accessToken: string): GooglePickerBuilder;
  setOrigin(origin: string): GooglePickerBuilder;
};

type GooglePickerApi = {
  DocsView: new (viewId?: string) => GooglePickerDocsView;
  Feature: { SUPPORT_DRIVES: string };
  PickerBuilder: new () => GooglePickerBuilder;
  ViewId: { FOLDERS: string };
};

type GoogleApiLoader = {
  load(
    name: "picker",
    options: {
      callback: () => void;
      onerror: () => void;
      ontimeout: () => void;
      timeout: number;
    },
  ): void;
};

export async function selectGoogleDriveFolder(
  session: GoogleDrivePickerSession,
): Promise<string | null> {
  const api = await loadGooglePickerApi();
  return await new Promise<string | null>((resolve, reject) => {
    try {
      const view = new api.DocsView(api.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setEnableDrives(true);
      const picker = new api.PickerBuilder()
        .setAppId(session.appId)
        .setDeveloperKey(session.developerKey)
        .setOAuthToken(session.accessToken)
        .setOrigin(window.location.origin)
        .setMaxItems(1)
        .enableFeature(api.Feature.SUPPORT_DRIVES)
        .addView(view)
        .setCallback((value) => {
          const selection = parseGooglePickerSelection(value);
          if (selection.kind === "picked") resolve(selection.folderId);
          if (selection.kind === "cancelled") resolve(null);
        })
        .build();
      picker.setVisible(true);
    } catch (error: unknown) {
      reject(error instanceof Error ? error : new Error("Google Picker could not be opened."));
    }
  });
}

export function parseGooglePickerSelection(value: unknown): GooglePickerSelection {
  if (!isRecord(value)) return { kind: "pending" };
  const action = value["action"];
  if (action === "cancel") return { kind: "cancelled" };
  if (action !== "picked") return { kind: "pending" };
  const documents = value["docs"];
  if (!Array.isArray(documents) || documents.length !== 1 || !isRecord(documents[0])) {
    return { kind: "pending" };
  }
  const folderId = documents[0]["id"];
  return typeof folderId === "string" && /^[A-Za-z0-9_-]{10,1024}$/u.test(folderId)
    ? { folderId, kind: "picked" }
    : { kind: "pending" };
}

async function loadGooglePickerApi(): Promise<GooglePickerApi> {
  const loaded = readGooglePickerApi();
  if (loaded !== null) return loaded;
  pickerApiPromise ??= createGooglePickerApiPromise();
  try {
    return await pickerApiPromise;
  } catch (error) {
    pickerApiPromise = null;
    throw error;
  }
}

function createGooglePickerApiPromise(): Promise<GooglePickerApi> {
  return new Promise<GooglePickerApi>((resolve, reject) => {
    const loadPickerModule = (): void => {
      const loader = readGoogleApiLoader();
      if (loader === null) {
        reject(new Error("Google API loader is unavailable."));
        return;
      }
      loader.load("picker", {
        callback: () => {
          const api = readGooglePickerApi();
          if (api === null) reject(new Error("Google Picker API is unavailable."));
          else resolve(api);
        },
        onerror: () => reject(new Error("Google Picker API failed to load.")),
        ontimeout: () => reject(new Error("Google Picker API timed out.")),
        timeout: 15_000,
      });
    };

    const existingScript = document.getElementById(pickerScriptId);
    if (existingScript !== null) {
      existingScript.addEventListener("load", loadPickerModule, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google API script failed to load.")),
        { once: true },
      );
      const loader = readGoogleApiLoader();
      if (loader !== null) loadPickerModule();
      return;
    }

    const script = document.createElement("script");
    script.id = pickerScriptId;
    script.src = pickerScriptUrl;
    script.async = true;
    script.addEventListener("load", loadPickerModule, { once: true });
    script.addEventListener("error", () => reject(new Error("Google API script failed to load.")), {
      once: true,
    });
    document.head.append(script);
  });
}

function readGoogleApiLoader(): GoogleApiLoader | null {
  const global = readWindowProperty("gapi");
  return isGoogleApiLoader(global) ? global : null;
}

function readGooglePickerApi(): GooglePickerApi | null {
  const google = readWindowProperty("google");
  if (!isRecord(google)) return null;
  const picker = google["picker"];
  return isGooglePickerApi(picker) ? picker : null;
}

function isGoogleApiLoader(value: unknown): value is GoogleApiLoader {
  return isRecord(value) && typeof value["load"] === "function";
}

function isGooglePickerApi(value: unknown): value is GooglePickerApi {
  if (!isRecord(value)) return false;
  const feature = value["Feature"];
  const viewId = value["ViewId"];
  return (
    typeof value["DocsView"] === "function" &&
    typeof value["PickerBuilder"] === "function" &&
    isRecord(feature) &&
    typeof feature["SUPPORT_DRIVES"] === "string" &&
    isRecord(viewId) &&
    typeof viewId["FOLDERS"] === "string"
  );
}

function readWindowProperty(key: string): unknown {
  const candidate: unknown = window;
  return isRecord(candidate) ? candidate[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
