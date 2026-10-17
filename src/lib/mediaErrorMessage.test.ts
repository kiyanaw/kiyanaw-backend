import { mediaErrorMessage } from './mediaErrorMessage';

describe('mediaErrorMessage', () => {
  it('explains decode failures the same way in both modes', () => {
    expect(mediaErrorMessage(3, 'cloud')).toMatch(/couldn't play the recording/);
    expect(mediaErrorMessage(3, 'local')).toMatch(/couldn't play the recording/);
  });

  it('points at connectivity or expired links in the cloud', () => {
    expect(mediaErrorMessage(2, 'cloud')).toMatch(/connection/);
    expect(mediaErrorMessage(4, 'cloud')).toMatch(/expired/);
  });

  it('never blames the network in local mode', () => {
    expect(mediaErrorMessage(2, 'local')).toMatch(/this device/);
    expect(mediaErrorMessage(4, 'local')).toMatch(/format|this device/);
    expect(mediaErrorMessage(undefined, 'local')).not.toMatch(/connection|contact support/);
  });

  it('never tells people to contact support', () => {
    for (const code of [undefined, 1, 2, 3, 4]) {
      expect(mediaErrorMessage(code, 'cloud')).not.toMatch(/contact support/);
    }
  });
});
