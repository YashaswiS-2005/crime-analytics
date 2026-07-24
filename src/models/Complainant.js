import mongoose from 'mongoose';

export const complainantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  { timestamps: true }
);

const Complainant = mongoose.models.Complainant || mongoose.model('Complainant', complainantSchema);

export default Complainant;
