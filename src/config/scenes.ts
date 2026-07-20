export const CAM_SCENE_MS = 20 * 60 * 1000
export const STATS_SCENE_MS = 3 * 60 * 1000
export const CAM_PREFETCH_LEAD_MS = 30 * 1000
export const CAM_REQUEST_TIMEOUT_MS = 25 * 1000

// A full document reload releases decoder, iframe, and GPU resources that
// third-party players can retain even after their documented destroy calls.
// Renewal is performed only when the stats scene finishes, never mid-video.
export const KIOSK_SESSION_RENEWAL_MS = 2 * 60 * 60 * 1000
