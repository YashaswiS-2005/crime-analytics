import mongoose from 'mongoose';
import { accusedSchema } from './Accused.js';
import { complainantSchema } from './Complainant.js';
import { victimSchema } from './Victim.js';

export const crimeRecordSchema = new mongoose.Schema(
  {
    incidentNumber: { type: String, required: true, unique: true, trim: true },
    crimeType: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    district: { type: String, trim: true, default: '' },
    offence: { type: String, trim: true, default: '' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        validate: {
          validator(value) {
            return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
          },
          message: 'Location coordinates must be [longitude, latitude].',
        },
      },
    },
    incidentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Open', 'In progress', 'Closed'], default: 'Open' },
    complainantDetails: complainantSchema,
    victimDetails: victimSchema,
    accusedDetails: accusedSchema,
    risk: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    suspect: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    phone: { type: String, default: '' },
    summary: { type: String, default: '' },
    officer: { type: String, default: '' },
    evidenceCount: { type: Number, default: 0 },
    witnessCount: { type: Number, default: 0 },
    sourceRow: { type: Number, default: 0 },
  },
  { timestamps: true }
);

crimeRecordSchema.index({ location: '2dsphere' });
crimeRecordSchema.index({ incidentDate: -1, district: 1, crimeType: 1 });
crimeRecordSchema.index({ district: 1, status: 1, risk: 1 });

crimeRecordSchema.pre('validate', function normalizeLocation(next) {
  if (!this.location?.type) this.location = { type: 'Point', coordinates: [0, 0] };
  if (!Array.isArray(this.location.coordinates) || this.location.coordinates.length !== 2) {
    this.location.coordinates = [0, 0];
  }
  this.location.coordinates = this.location.coordinates.map((value) => (Number.isFinite(Number(value)) ? Number(value) : 0));
  next();
});

crimeRecordSchema.set('toJSON', {
  virtuals: true,
  transform(doc, returned) {
    returned.id = returned.incidentNumber;
    returned.offence = returned.offence || returned.crimeType;
    delete returned.__v;
    return returned;
  },
});

const CrimeRecord = mongoose.models.CrimeRecord || mongoose.model('CrimeRecord', crimeRecordSchema);

export default CrimeRecord;
