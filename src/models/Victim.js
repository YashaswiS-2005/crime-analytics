import mongoose from 'mongoose';

export const victimSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    age: { type: Number, min: 0, max: 130, default: null },
    gender: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const Victim = mongoose.models.Victim || mongoose.model('Victim', victimSchema);

export default Victim;
