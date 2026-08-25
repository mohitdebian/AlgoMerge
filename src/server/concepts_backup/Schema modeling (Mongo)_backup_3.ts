// Schema modeling (Mongo)
import { Schema } from 'mongoose';
const mySchema = new Schema({
  name: { type: String, required: true },
  age: { type: Number, index: true }
});
