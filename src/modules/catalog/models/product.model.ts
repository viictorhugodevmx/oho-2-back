import { type InferSchemaType, model, Schema } from "mongoose";

export const PRODUCT_CATEGORIES = [
  "apparel",
  "accessories",
  "wall-art",
  "objects",
] as const;

export const PRODUCT_FORMATS = ["standard", "large", "premium"] as const;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer.",
};

const optionValueSchema = new Schema(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    priceModifierCents: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    colorHex: {
      type: String,
      trim: true,
      match: colorPattern,
    },
  },
  {
    _id: false,
  },
);

const optionSchema = new Schema(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    values: {
      type: [optionValueSchema],
      required: true,
      validate: {
        validator: (values: unknown[]) => values.length > 0,
        message: "A product option must contain at least one value.",
      },
    },
  },
  {
    _id: false,
  },
);

const formatSchema = new Schema(
  {
    value: {
      type: String,
      enum: PRODUCT_FORMATS,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    priceAdjustmentCents: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
  },
  {
    _id: false,
  },
);

const printAreaSchema = new Schema(
  {
    top: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    left: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    width: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    height: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    rotation: {
      type: Number,
      min: -360,
      max: 360,
    },
  },
  {
    _id: false,
  },
);

const productSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
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
      enum: PRODUCT_CATEGORIES,
      required: true,
    },
    basePriceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    gallery: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    badge: {
      type: String,
      trim: true,
    },
    formats: {
      type: [formatSchema],
      required: true,
      validate: {
        validator: (formats: unknown[]) => formats.length > 0,
        message: "A product must contain at least one format.",
      },
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    printArea: {
      type: printAreaSchema,
      required: true,
    },
    printProviderProductId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    collection: "products",
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index({
  active: 1,
  category: 1,
});

productSchema.index({
  active: 1,
  featured: -1,
  name: 1,
});

export type ProductDocument = InferSchemaType<typeof productSchema>;

export const ProductModel = model<ProductDocument>("Product", productSchema);
