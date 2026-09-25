import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES, MAX_PHOTOS } from './evidence-files';

export const reportFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'photos', maxCount: MAX_PHOTOS },
    { name: 'receipt', maxCount: 1 },
  ],
  {
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: MAX_PHOTOS + 1,
    },
  },
);
