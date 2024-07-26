import mongoose, { Document, Schema } from 'mongoose';

export interface Product extends Document {
  name: string;
  description: string;
  price: number;
  location: string;
  shippingType: 'free' | 'priced';
  shippingPrice?: number;
  image?: string;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  shippingType: { type: String, enum: ['free', 'priced'], required: true },
  shippingPrice: { type: Number },
  image: { type: String },
});

export default mongoose.model<Product>('Product', ProductSchema);
