import { describe, expect, it } from 'vitest'
import { parsePhotoPickSettingsPatch } from '../src/settings-http.ts'

describe('parsePhotoPickSettingsPatch', () => {
  it('accepts vision enable + model fields', () => {
    expect(parsePhotoPickSettingsPatch({
      visionEnabled: true,
      visionLlmProvider: ' modelscope ',
      visionModel: ' qwen-vl ',
      visionScorePrompt: ' prefer smiles ',
    })).toEqual({
      visionEnabled: true,
      visionLlmProvider: 'modelscope',
      visionModel: 'qwen-vl',
      visionScorePrompt: ' prefer smiles ',
    })
  })

  it('rejects malformed bodies', () => {
    expect(parsePhotoPickSettingsPatch(null)).toBeUndefined()
    expect(parsePhotoPickSettingsPatch({ visionEnabled: 'yes' })).toBeUndefined()
  })
})
