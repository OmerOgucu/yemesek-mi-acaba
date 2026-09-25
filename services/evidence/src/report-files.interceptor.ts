import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES, MAX_PHOTOS, MAX_RECEIPTS } from './dto/upload-limits';

export const reportFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'photos', maxCount: MAX_PHOTOS },
    { name: 'receipt', maxCount: MAX_RECEIPTS },
  ],
  {
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: MAX_PHOTOS + MAX_RECEIPTS,
    },
  },
);
