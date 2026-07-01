// A cam is either a YouTube channel (resolved to its current live video at
// request time and played via YouTube's ad-free IFrame player) or a direct HLS
// stream (played via hls.js). Both are ad-free.
interface LiveCamBase {
  id: string
  title: string
  location: string
}

export type LiveCamDefinition =
  | (LiveCamBase & {
      kind: 'youtube'
      // Channel handle (without '@'); its `/live` URL resolves the current
      // live video. `title` here is only a fallback if the live title is empty.
      handle: string
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

// Curated ad-free animal cams. Idle/offline cams are skipped automatically.
//
// - explore.org: nonprofit live-nature-cam network. Non-monetized YouTube live
//   streams => YouTube's own player, ad-free, adaptive HD. (Includes Katmai
//   National Park's Brooks Falls bear cams.)
// - U.S. Fish & Wildlife Service: a federal agency (ad-free) live wildlife cam.
// - San Diego Zoo: direct HLS from the zoo's own CDN.
// - Coeur d'Alene Floating Green: Verkada-hosted live cam resolved/proxied
//   server-side because embed-domain restrictions block direct embedding here.
export const LIVE_CAMS: LiveCamDefinition[] = [
  // explore.org (YouTube)
  { id: 'explore-nature', kind: 'youtube', handle: 'ExploreLiveNatureCams', title: 'Featured Nature Cam', location: 'explore.org' },
  { id: 'explore-bears', kind: 'youtube', handle: 'explorebears', title: 'Brown Bears', location: 'explore.org' },
  { id: 'explore-oceans', kind: 'youtube', handle: 'ExploreOceans', title: 'Ocean Cam', location: 'explore.org' },
  { id: 'explore-birds', kind: 'youtube', handle: 'ExploreBirds', title: 'Bird & Eagle Cams', location: 'explore.org' },
  { id: 'explore-pandas-polar', kind: 'youtube', handle: 'ExplorePandasandPolarBears', title: 'Pandas & Polar Bears', location: 'explore.org' },
  { id: 'explore-sloth-macaws', kind: 'youtube', handle: 'ExploreSlothandMacaws', title: 'Sloths & Macaws', location: 'explore.org' },
  { id: 'explore-penguins-puffins', kind: 'youtube', handle: 'ExplorePenguinsandPuffins', title: 'Penguins & Puffins', location: 'explore.org' },
  { id: 'explore-owls-condors', kind: 'youtube', handle: 'ExploreOwlsandCondors', title: 'Owls & Condors', location: 'explore.org' },
  { id: 'explore-osprey-falcons', kind: 'youtube', handle: 'ExploreOspreyandFalcons', title: 'Osprey & Falcons', location: 'explore.org' },
  { id: 'explore-whales-seals', kind: 'youtube', handle: 'ExploreWhalesWalrusesSeals', title: 'Whales, Walruses & Seals', location: 'explore.org' },
  { id: 'explore-zen', kind: 'youtube', handle: 'ExploreZenDen', title: 'Zen Den', location: 'explore.org' },
  { id: 'explore-africa', kind: 'youtube', handle: 'ExploreAfrica', title: 'African Wildlife', location: 'explore.org' },
  { id: 'explore-farm', kind: 'youtube', handle: 'ExploreFarmLife', title: 'Farm Life', location: 'explore.org' },
  { id: 'explore-dogs', kind: 'youtube', handle: 'ExploreDogs', title: 'Dogs & Puppies', location: 'explore.org' },
  { id: 'explore-wolves-bison', kind: 'youtube', handle: 'ExploreWolvesandBison', title: 'Wolves & Bison', location: 'explore.org' },
  { id: 'explore-apes', kind: 'youtube', handle: 'ExploreGreatApes', title: 'Great Apes', location: 'explore.org' },
  { id: 'explore-hummingbirds', kind: 'youtube', handle: 'ExploreHummingbirds', title: 'Hummingbirds', location: 'explore.org' },
  { id: 'explore-cats', kind: 'youtube', handle: 'ExploreCatsLionsTigers', title: 'Cats, Lions & Tigers', location: 'explore.org' },

  // U.S. Fish & Wildlife Service (YouTube, federal / ad-free)
  { id: 'usfws-eagles', kind: 'youtube', handle: 'USFWS', title: 'Bald Eagle Nest Cam', location: 'U.S. Fish & Wildlife Service' },

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
