import { detectImage, photoUrlList, VENUE_PNG } from './evidence-files';
import { stripImageMetadata } from './strip-metadata';

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

  it('strips jpeg exif segments that carry location text', () => {
    const payload = Buffer.from('GPSLatitude SECRET', 'ascii');
    const segment = Buffer.alloc(4 + payload.length);
    segment[0] = 0xff;
    segment[1] = 0xe1;
    segment.writeUInt16BE(payload.length + 2, 2);
    payload.copy(segment, 4);
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      segment,
      Buffer.from([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]),
    ]);
    const stripped = stripImageMetadata(jpeg, 'jpg');
    expect(stripped.toString('ascii')).not.toContain('GPSLatitude');
    expect(stripped[0]).toBe(0xff);
    expect(stripped[1]).toBe(0xd8);
  });

  it('drops paths that are not public uploads', () => {
    expect(photoUrlList(['/uploads/seed/venue.png', 'https://evil.example/a.png', '../secret.png'])).toEqual([
      '/uploads/seed/venue.png',
    ]);
  });
});
