interface CamSelectionBase {
  id: string
  title: string
  location: string
}

export type CamSelection =
  | (CamSelectionBase & { kind: 'youtube'; youtubeId: string })
  | (CamSelectionBase & { kind: 'hls'; hlsUrl: string })
