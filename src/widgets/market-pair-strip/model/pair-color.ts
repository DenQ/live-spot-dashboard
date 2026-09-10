import { cssVar } from '@shared/lib'

export function pairColor(instrumentId: string) {
  return cssVar(`--pair-${instrumentId.toLowerCase()}`) || cssVar('--pair-fallback')
}
