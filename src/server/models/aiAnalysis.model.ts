import mongoose, { Schema, Document } from 'mongoose';

export interface IAiAnalysis extends Document {
  owner: string;
  repo: string;
  issueTitle: string;
  analysis: string;
  isPR: boolean;
  createdAt: Date;
}

const AiAnalysisSchema: Schema = new Schema({
  owner: { type: String, required: true, index: true },
  repo: { type: String, required: true, index: true },
  issueTitle: { type: String, required: true },
  analysis: { type: String, required: true },
  isPR: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // Auto-delete after 7 days
});

// Compound index for fast lookup of a specific issue analysis
AiAnalysisSchema.index({ owner: 1, repo: 1, issueTitle: 1 }, { unique: true });

export const AiAnalysis = mongoose.model<IAiAnalysis>('AiAnalysis', AiAnalysisSchema);
