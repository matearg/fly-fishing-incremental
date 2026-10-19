import { FLY_ICONS } from '../icons'
import { paint, type Bitmap, type Grid } from '../pixels'
import { refine } from '../refine'

// The fly at the end of a line: a tiny version of each pattern's panel icon, in its palette, facing right.
export const LINE_FLIES: Record<string, Grid> = {
  basicDry: [ // upright wing
    '...W...',
    '..Ww...',
    't.kKk..',
    '.tkkkkh',
    '....hh.',
  ],
  elkHair: [ // tent wing over the body
    '.......',
    '...dEE.',
    '.eeeEEd',
    'eekkkkh',
    '....hh.',
  ],
  pheasantTail: [ // slim, dark thorax
    '.......',
    'tt...T.',
    '.tbbTTh',
    '....hh.',
    '.......',
  ],
  haresEar: [ // shaggy, gold rib
    '.......',
    'f.FfDd.',
    '.fgfgDh',
    '..fFf..',
    '....hh.',
  ],
  woollyBugger: [ // long marabou tail, palmered body
    '..........',
    'mmM.kCkCk.',
    'mMmmcCcCch',
    'mm..kckck.',
    '.......hh.',
  ],
  zonker: [ // rabbit strip over a mylar body
    '..FfFfFf..',
    'ffFsSsSsSh',
    'f...ssss..',
    '.......hh.',
  ],
}
// Where the line ties on (the hook eye), in sprite pixels.
export const LINE_FLY_EYE: Record<string, [number, number]> = {
  basicDry: [6, 3], elkHair: [6, 3], pheasantTail: [6, 2], haresEar: [6, 2], woollyBugger: [9, 2], zonker: [9, 1],
}

// An id from an old save with no art draws as the Basic Dry instead of throwing.
export function lineFlyBitmap(patternId: string): Bitmap {
  const id = patternId in LINE_FLIES ? patternId : 'basicDry'
  return refine(paint(LINE_FLIES[id], FLY_ICONS[id].palette))
}
