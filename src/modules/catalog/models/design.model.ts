import { type InferSchemaType, model, Schema } from "mongoose";

export const DESIGN_CATEGORIES = [
  "concert",
  "street",
  "studio",
  "backstage",
  "portrait",
] as const;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const urlValidator = {
  validator: (value: string) => URL.canParse(value),
  message: "{PATH} must be a valid URL.",
};

const designSchema = new Schema(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: slugPattern,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: DESIGN_CATEGORIES,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: urlValidator,
    },
    photographer: {
      type: String,
      required: true,
      trim: true,
    },
    photographerUrl: {
      type: String,
      required: true,
      trim: true,
      validate: urlValidator,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    drop: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (tags: string[]) => tags.length > 0,
        message: "A design must contain at least one tag.",
      },
    },
    printProviderFileId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    collection: "designs",
    timestamps: true,
    versionKey: false,
  },
);

designSchema.index({
  active: 1,
  category: 1,
});

designSchema.index({
  active: 1,
  featured: -1,
  title: 1,
});

export type DesignDocument = InferSchemaType<typeof designSchema>;

export const DesignModel = model<DesignDocument>("Design", designSchema);
