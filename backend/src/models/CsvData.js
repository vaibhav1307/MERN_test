import mongoose from 'mongoose';

const csvDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  data: {
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
csvDataSchema.index({ userId: 1, uploadedAt: -1 });

export default mongoose.model('CsvData', csvDataSchema);