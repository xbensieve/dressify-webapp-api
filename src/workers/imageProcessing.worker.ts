import { createWorker } from '@infrastructure/queue/bullmq';
import { uploadToCloudinary } from '@infrastructure/storage/cloudinary';
import { ProductImageModel } from '@modules/products/products.schema';
import { logger } from '@shared/logger/pino';

interface ImageJobData extends Record<string, unknown> {
  productId: string;
  filePath: string;
  fileName: string;
  displayOrder: number;
  isPrimary: boolean;
}

export const startImageProcessingWorker = () => {
  const worker = createWorker<ImageJobData>(
    'image-processing',
    async (data, jobName) => {
      logger.info({ jobName, productId: data.productId }, 'Processing image job');

      const result = await uploadToCloudinary(data.filePath, { folder: 'products' });

      await ProductImageModel.create({
        productId: data.productId,
        imageUrl: result.secure_url,
        altText: data.fileName,
        displayOrder: data.displayOrder,
        isPrimary: data.isPrimary,
      });

      logger.info({ productId: data.productId, url: result.secure_url }, 'Image processed and saved');
    },
    { concurrency: 2 },
  );

  logger.info('Image processing worker started');
  return worker;
};
