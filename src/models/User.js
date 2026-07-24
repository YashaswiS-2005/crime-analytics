import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9._-]{3,32}$/,
    },
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['Admin', 'Analyst', 'Officer'],
      default: 'Analyst',
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function preHash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(doc, returned) {
    delete returned.password;
    delete returned.refreshTokens;
    delete returned.__v;
    return returned;
  },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
