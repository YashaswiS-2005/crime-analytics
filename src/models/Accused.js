import mongoose from 'mongoose';

export const accusedSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const Accused = mongoose.models.Accused || mongoose.model('Accused', accusedSchema);

export default Accused;
