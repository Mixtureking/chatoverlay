let cachedOverlaySettings: unknown = null;

export function getOverlaySettings() {
  return cachedOverlaySettings;
}

export function setOverlaySettings(settings: unknown) {
  cachedOverlaySettings = settings;
  return cachedOverlaySettings;
}
