import type { Icon } from './icons'

// The tab icon: a rainbow trout leaping for the fly, nose up and to the right. Browsers pick 16 or 32 by screen density.
const PALETTE = {
  o: 0x10222b, // outline, as on the fish sprites
  a: 0x5d6b3c, // olive back
  k: 0x1e2418, // spots
  s: 0xd96a8a, // pink side stripe
  b: 0xc4ccd0, // silver flank
  w: 0xeef2f2, // white belly
  f: 0xa8a688, // fins
  g: 0x7a8a94, // gill line
  e: 0x0b0b0b, // eye
}

export const FAVICONS: Icon[] = [
  {
    grid: [
      '................',
      '................',
      '.....oooooooooo.',
      '....offfakkaaaao',
      '....ofakakasesbo',
      '...ofakaassgbbwo',
      '...oaaassbbbgwo.',
      '.oooaasbbbwwgo..',
      'offfasbbwwwoo...',
      'offsbwwwofo.....',
      '.oofoooo.o......',
      '.offo...........',
      '..ofo...........',
      '..ofo...........',
      '...o............',
      '................',
    ],
    palette: PALETTE,
  },
  {
    grid: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.................oooooooooo.....',
      '..........oooooooaaakaaaaaaoo...',
      '.........ofkfffakaaaaaaaaakaao..',
      '.........offfakaaaaaaaaaewssso..',
      '..........ofkaaaaaaasssseebbbo..',
      '..........okaaakaasssssbbbbbwo..',
      '........ooaaaaaasssssbggbbwwwo..',
      '.......ofkakaasssssbbbbgwwwwo...',
      '.o.....ofkaaassssbbbbbwgwwoo....',
      'ofo....oakkssssbbbbbwwwgwo......',
      'okfo...okksssbbbbbwwwwwoo.......',
      'offfooookssbbbbbwwwwwoo.........',
      '.offfffkssbbbbwwwwwoo...........',
      '..offkfsbbbwwwwwwoo.............',
      '...offfbwwwwooooo...............',
      '...offffooooooffo...............',
      '...offfo......oo................',
      '...okffo........................',
      '....offo........................',
      '....offo........................',
      '.....oo.........................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
    palette: PALETTE,
  },
]
