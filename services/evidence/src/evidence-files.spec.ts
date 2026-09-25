import { detectImage, photoUrlList, VENUE_PNG } from './evidence-files';

describe('evidence files', () => {
  it('accepts png, jpeg, and webp magic bytes', () => {
    expect(detectImage(VENUE_PNG)).toBe('png');
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectImage(jpeg)).toBe('jpg');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    expect(detectImage(webp)).toBe('webp');
    expect(detectImage(Buffer.from('not an image!!'))).toBeNull();
  });

  it('drops paths that are not public uploads', () => {
    expect(photoUrlList(['/uploads/seed/venue.png', 'https://evil.example/a.png', '../secret.png'])).toEqual([
      '/uploads/seed/venue.png',
    ]);
  });
});
