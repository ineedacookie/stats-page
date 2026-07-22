// A cam is either a specific YouTube livestream, a YouTube channel (resolved
// to its current featured live video), or a direct HLS stream.
interface LiveCamBase {
  id: string
  title: string
  location: string
}

export type LiveCamDefinition =
  | (LiveCamBase & {
      kind: 'youtube-channel'
      // Channel handle (without '@'); its `/live` URL resolves the current
      // live video. `title` here is only a fallback if the live title is empty.
      handle: string
    })
  | (LiveCamBase & {
      kind: 'youtube-video'
      // A specific broadcast URL published by a trusted source page.
      // Keep these limited to feeds that are intended to run continuously.
      videoId: string
    })
  | (LiveCamBase & {
      kind: 'hls'
      hlsUrl: string
    })
  | (LiveCamBase & {
      kind: 'verkada'
      // Verkada auth/embed URL published by the source site. We resolve this to
      // a short-lived HLS manifest token server-side and proxy playback.
      authUrl: string
    })

// San Diego Zoo publishes each cam as a direct HLS stream on its public CDN
// (open CORS). Channels drift occasionally (e.g. `zssd-panda` -> `zssd-panda2024`);
// find the current one on the cam's page under https://zoo.sandiegozoo.org/cams/*.
const camzone = (channel: string): string =>
  `https://${channel}.hls.camzonecdn.com/CamzoneStreams/${channel}/playlist.m3u8`

// Curated for ad-free live playback. Idle/offline cams are skipped
// automatically.
//
// Ad policy: YouTube entries must be official nonprofit or government feeds
// that do not monetize their live broadcasts. Do not add commercial channels
// with uncertain ad behavior. YouTube ultimately controls its embeds, so this
// is a best-effort policy rather than an absolute technical guarantee.
//
// - explore.org: nonprofit live-nature-cam network. Non-monetized YouTube live
//   streams played through YouTube's adaptive player. (Includes Katmai National
//   Park's Brooks Falls bear cams.)
// - Friends of Big Bear Valley: nonprofit eagle cams, free and non-monetized.
// - National Park Service: official U.S. government educational feeds.
// - Monterey Bay Aquarium: nonprofit aquarium education feeds.
// - Duluth Harbor Cam (LSMMA partner): nonprofit maritime city-harbor cams.
// - Noyo Center for Marine Science: nonprofit harbor live cam.
// - Coral City Camera: nonprofit urban marine education cam (Miami).
// - NASA: official U.S. government live space views.
// - NOAA Ocean Exploration: official U.S. government ocean expeditions.
// - USGS: official U.S. government volcano livestreams.
// - Cornell Lab Bird Cams: nonprofit ornithology education livestreams.
// - The Whale Museum: nonprofit marine-research webcam feed.
// - UAF Fairbanks Aurora Cam: educational aurora feed (via explore.org).
// - Raptor Resource Project: nonprofit eagle and raptor nest cams.
// - U.S. Fish & Wildlife Service: a federal live wildlife cam.
// - San Diego Zoo: direct HLS from the zoo's own CDN.
// - Coeur d'Alene Floating Green: Verkada-hosted live cam resolved/proxied
//   server-side because embed-domain restrictions block direct embedding here.
export const LIVE_CAMS: LiveCamDefinition[] = [
  // Requested source pages (verified embeds):
  // - http://hyrumdamcam.com/
  // - https://friendsofbigbearvalley.org/livestream/
  { id: 'hyrum-dam-live', kind: 'youtube-video', videoId: 'xE5HObctj6c', title: 'Hyrum Dam Live Cam', location: 'Hyrum, Utah' },
  { id: 'fobbv-eagle-cam-1', kind: 'youtube-video', videoId: 'B4-L2nfGcuE', title: 'Big Bear Bald Eagle Nest - Cam 1', location: 'Big Bear Valley, California' },
  { id: 'fobbv-eagle-cam-2', kind: 'youtube-video', videoId: '41eq4VzCYc4', title: 'Big Bear Bald Eagle Wide View - Cam 2', location: 'Big Bear Valley, California' },
  { id: 'nps-live', kind: 'youtube-channel', handle: 'nationalparkservice', title: 'National Park Service Live', location: 'U.S. National Park Service' },
  { id: 'monterey-bay-aquarium-live', kind: 'youtube-channel', handle: 'MontereyBayAquarium', title: 'Monterey Bay Aquarium Live Cam', location: 'Monterey Bay Aquarium, California' },
  { id: 'duluth-canal-cam', kind: 'youtube-video', videoId: 'HPS48TMmNag', title: 'Duluth Canal Cam', location: 'Duluth Harbor, Minnesota' },
  { id: 'noyo-harbor-cam', kind: 'youtube-video', videoId: 'Yk1KoIAj6A8', title: 'Noyo Harbor Cam', location: 'Fort Bragg, California' },
  { id: 'coral-city-camera', kind: 'youtube-video', videoId: '7i8ARjIeM2k', title: 'Coral City Camera', location: 'Miami, Florida' },
  { id: 'nasa-iss-earth-view', kind: 'youtube-video', videoId: 'awQzjn72bI0', title: 'ISS Earth View', location: 'NASA / Low Earth Orbit' },
  { id: 'noaa-ocean-exploration-live', kind: 'youtube-channel', handle: 'oceanexplorergov', title: 'NOAA Ocean Exploration Live', location: 'NOAA Ocean Exploration' },
  { id: 'usgs-kilauea-v1', kind: 'youtube-video', videoId: 'HggWKlZv9yk', title: 'Kilauea Volcano Live (V1)', location: 'Hawaiian Volcano Observatory, Hawaii' },
  { id: 'usgs-kilauea-v2', kind: 'youtube-video', videoId: 'Tz5tPqRRv1Y', title: 'Kilauea Volcano Live (V2)', location: 'Hawaiian Volcano Observatory, Hawaii' },
  { id: 'usgs-kilauea-v3', kind: 'youtube-video', videoId: 'gXKuUyKt8mc', title: 'Kilauea Volcano Live (V3)', location: 'Hawaiian Volcano Observatory, Hawaii' },
  { id: 'cornell-bird-cams', kind: 'youtube-channel', handle: 'CornellBirdCams', title: 'Cornell Bird Cams', location: 'Cornell Lab of Ornithology' },
  { id: 'whale-museum-live', kind: 'youtube-channel', handle: 'thewhalemuseum', title: 'Lime Kiln Lighthouse Webcam', location: 'San Juan Island, Washington' },
  { id: 'uaf-fairbanks-aurora', kind: 'youtube-video', videoId: 'O52zDyxg5QI', title: 'Fairbanks Aurora Camera', location: 'Fairbanks, Alaska' },
  { id: 'raptor-resource-live', kind: 'youtube-channel', handle: 'RaptorResourceProject', title: 'Raptor Resource Project Live', location: 'Decorah, Iowa' },

  // explore.org category channels add whichever other broadcast is currently
  // featured live, while the entries above guarantee the requested viewpoints.
  { id: 'explore-nature', kind: 'youtube-channel', handle: 'ExploreLiveNatureCams', title: 'Featured Nature Cam', location: 'explore.org' },
  { id: 'explore-bears', kind: 'youtube-channel', handle: 'explorebears', title: 'Brown Bears', location: 'explore.org' },
  { id: 'explore-oceans', kind: 'youtube-channel', handle: 'ExploreOceans', title: 'Ocean Cam', location: 'explore.org' },
  { id: 'explore-birds', kind: 'youtube-channel', handle: 'ExploreBirds', title: 'Bird & Eagle Cams', location: 'explore.org' },
  { id: 'explore-pandas-polar', kind: 'youtube-channel', handle: 'ExplorePandasandPolarBears', title: 'Pandas & Polar Bears', location: 'explore.org' },
  { id: 'explore-sloth-macaws', kind: 'youtube-channel', handle: 'ExploreSlothandMacaws', title: 'Sloths & Macaws', location: 'explore.org' },
  { id: 'explore-penguins-puffins', kind: 'youtube-channel', handle: 'ExplorePenguinsandPuffins', title: 'Penguins & Puffins', location: 'explore.org' },
  { id: 'explore-owls-condors', kind: 'youtube-channel', handle: 'ExploreOwlsandCondors', title: 'Owls & Condors', location: 'explore.org' },
  { id: 'explore-osprey-falcons', kind: 'youtube-channel', handle: 'ExploreOspreyandFalcons', title: 'Osprey & Falcons', location: 'explore.org' },
  { id: 'explore-whales-seals', kind: 'youtube-channel', handle: 'ExploreWhalesWalrusesSeals', title: 'Whales, Walruses & Seals', location: 'explore.org' },
  { id: 'explore-zen', kind: 'youtube-channel', handle: 'ExploreZenDen', title: 'Zen Den', location: 'explore.org' },
  { id: 'explore-africa', kind: 'youtube-channel', handle: 'ExploreAfrica', title: 'African Wildlife', location: 'explore.org' },
  { id: 'explore-farm', kind: 'youtube-channel', handle: 'ExploreFarmLife', title: 'Farm Life', location: 'explore.org' },
  { id: 'explore-dogs', kind: 'youtube-channel', handle: 'ExploreDogs', title: 'Dogs & Puppies', location: 'explore.org' },
  { id: 'explore-wolves-bison', kind: 'youtube-channel', handle: 'ExploreWolvesandBison', title: 'Wolves & Bison', location: 'explore.org' },
  { id: 'explore-apes', kind: 'youtube-channel', handle: 'ExploreGreatApes', title: 'Great Apes', location: 'explore.org' },
  { id: 'explore-hummingbirds', kind: 'youtube-channel', handle: 'ExploreHummingbirds', title: 'Hummingbirds', location: 'explore.org' },
  { id: 'explore-cats', kind: 'youtube-channel', handle: 'ExploreCatsLionsTigers', title: 'Cats, Lions & Tigers', location: 'explore.org' },

  // U.S. Fish & Wildlife Service (YouTube, federal / ad-free)
  { id: 'usfws-eagles', kind: 'youtube-channel', handle: 'USFWS', title: 'Bald Eagle Nest Cam', location: 'U.S. Fish & Wildlife Service' },

  // Coeur d'Alene Resort Golf Course (Verkada embed)
  {
    id: 'floating-green-course',
    kind: 'verkada',
    title: 'Floating Green 14th Hole',
    location: 'Coeur d’Alene Resort Golf Course',
    authUrl:
      'https://vauth.command.verkada.com/__v/the-hagadone-corporation/embed/html/8221eb92-97ac-4ab8-900e-7f0e21c83474/?widescreen=1',
  },

  // San Diego Zoo (direct HLS)
  { id: 'sdz-panda', kind: 'hls', title: 'Giant Pandas', location: 'San Diego Zoo', hlsUrl: camzone('zssd-panda2024') },
  { id: 'sdz-tiger', kind: 'hls', title: 'Sumatran Tigers', location: 'San Diego Zoo Safari Park', hlsUrl: camzone('zssd-tiger') },
  { id: 'sdz-polar', kind: 'hls', title: 'Polar Bears', location: 'San Diego Zoo', hlsUrl: camzone('polarplunge') },
  { id: 'sdz-ape', kind: 'hls', title: 'Great Apes', location: 'San Diego Zoo', hlsUrl: camzone('ape') },
  { id: 'sdz-penguin', kind: 'hls', title: 'African Penguins', location: 'San Diego Zoo', hlsUrl: camzone('zssd-penguin') },
  { id: 'sdz-koala', kind: 'hls', title: 'Koalas', location: 'San Diego Zoo', hlsUrl: camzone('zssd-koala') },
  { id: 'sdz-hippo', kind: 'hls', title: 'Hippos', location: 'San Diego Zoo', hlsUrl: camzone('zssd-hippo') },
  { id: 'sdz-red-panda', kind: 'hls', title: 'Red Pandas', location: 'San Diego Zoo', hlsUrl: camzone('zssd-rpanda') },
]
