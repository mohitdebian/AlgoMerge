import mongoose, { Schema, Document } from 'mongoose';

export interface IAiAnalysisMetadata {
  tokenUsage?: number;
  model: string;
  executionTimeMs?: number;
}

export interface IAiAnalysis extends Document {
  owner: string;
  repo: string;
  issueTitle: string;
  analysis: string;
  isPR: boolean;
  metadata?: IAiAnalysisMetadata; // Demonstrates Embedded subdocument relationship
  authorReference?: mongoose.Types.ObjectId; // Demonstrates Referencing relationship
  createdAt: Date;
}

const AiAnalysisMetadataSchema = new Schema({
  tokenUsage: { type: Number, default: 0 },
  model: { type: String, default: 'gemini-2.5-flash' },
  executionTimeMs: { type: Number, default: 0 },
}, { _id: false });

const AiAnalysisSchema: Schema = new Schema({
  owner: { type: String, required: true, index: true },
  repo: { type: String, required: true, index: true },
  issueTitle: { type: String, required: true },
  analysis: { type: String, required: true },
  isPR: { type: Boolean, default: false },
  metadata: { type: AiAnalysisMetadataSchema }, // Embedded Relationship
  authorReference: { type: Schema.Types.ObjectId, ref: 'User' }, // Referenced Relationship
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // Auto-delete after 7 days
});

// Compound index for fast lookup of a specific issue analysis
AiAnalysisSchema.index({ owner: 1, repo: 1, issueTitle: 1 }, { unique: true });

/**
 * Demonstrates MongoDB Aggregation Pipelines (Grouping, Filtering, Sorting)
 */
export const getAnalysisStatistics = async (owner: string, repo: string) => {
  return AiAnalysis.aggregate([
    { $match: { owner, repo } }, // Stage 1: Filter
    {
      $group: { // Stage 2: Grouping & Metrics aggregation
        _id: '$isPR',
        count: { $sum: 1 },
        averageAnalysisLength: { $avg: { $strLenCP: '$analysis' } },
        latestAnalysisDate: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } }, // Stage 3: Sorting
  ]);
};

export const AiAnalysis = mongoose.model<IAiAnalysis>('AiAnalysis', AiAnalysisSchema);
