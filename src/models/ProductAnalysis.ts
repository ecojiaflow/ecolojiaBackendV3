// PATH: backend/src/models/ProductAnalysis.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IProductAnalysis extends Document {
  productName: string;
  category: string;
  base: any;
  enhance?: any;
  createdAt: Date;
}

const ProductAnalysisSchema = new Schema<IProductAnalysis>(
  {
    productName: { type: String, required: true, index: true },
    category: { type: String, required: true },
    base: { type: Schema.Types.Mixed, required: true },
    enhance: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date() }
  },
  { collection: 'product_analyses' }
);

export const ProductAnalysisModel = mongoose.model<IProductAnalysis>(
  'ProductAnalysis',
  ProductAnalysisSchema
);
// EOF
