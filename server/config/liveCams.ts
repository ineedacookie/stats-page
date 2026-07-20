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
      // A specific live broadcast. Seasonal broadcasts are retained safely
      // because the liveness check skips them whenever they are offline.
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

// Curated for ad-free animal playback. Idle/offline cams are skipped
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
// - U.S. Fish & Wildlife Service: a federal live wildlife cam.
// - San Diego Zoo: direct HLS from the zoo's own CDN.
// - Coeur d'Alene Floating Green: Verkada-hosted live cam resolved/proxied
//   server-side because embed-domain restrictions block direct embedding here.
export const LIVE_CAMS: LiveCamDefinition[] = [
  // Specific explore.org broadcasts verified live and embeddable on 2026-07-20.
  { id: 'explore-brooks-falls', kind: 'youtube-video', videoId: 'J7ZrIDvqlic', title: 'Brooks Falls Bear Cam', location: 'Katmai National Park, Alaska' },
  { id: 'explore-brooks-river-watch', kind: 'youtube-video', videoId: 'wkVLYfU-Kew', title: 'Brooks River Bear Cam', location: 'Katmai National Park, Alaska' },
  { id: 'explore-kats-river-view', kind: 'youtube-video', videoId: 'cTsjMtjRLCo', title: "Kat's River View Bear Cam", location: 'Katmai National Park, Alaska' },
  { id: 'explore-anan-lower-falls', kind: 'youtube-video', videoId: 'RhP-_jX8-Zs', title: 'Anan Lower Falls Bear Cam', location: 'Tongass National Forest, Alaska' },
  { id: 'explore-anan-fishing-hole', kind: 'youtube-video', videoId: 'ypMu3yA7h3s', title: 'Anan Fishing Hole Bear Cam', location: 'Tongass National Forest, Alaska' },
  { id: 'explore-tembe-elephants', kind: 'youtube-video', videoId: '0P_LBKqVbfs', title: 'Tembe Elephant Waterhole', location: 'Tembe Elephant Park, South Africa' },
  { id: 'explore-puffin-ledge', kind: 'youtube-video', videoId: 'daFe_ygulPY', title: 'Atlantic Puffin Loafing Ledge', location: 'Seal Island, Maine' },
  { id: 'explore-penguin-beach', kind: 'youtube-video', videoId: 'GSxpCbXsvtI', title: 'Penguin Beach', location: 'Aquarium of the Pacific, California' },
  { id: 'explore-bonobos', kind: 'youtube-video', videoId: 'gqP5nBCRbHA', title: 'Bonobo Sanctuary', location: 'Lola ya Bonobo, DR Congo' },
  { id: 'explore-condors-san-simeon', kind: 'youtube-video', videoId: '1u6rKUrUot8', title: 'California Condor Sanctuary', location: 'San Simeon, California' },
  { id: 'explore-jellyfish', kind: 'youtube-video', videoId: 'IYG9fnz40-E', title: 'Jellyfish Cam', location: 'Aquarium of the Pacific, California' },

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
