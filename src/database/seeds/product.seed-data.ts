import type { PRODUCT_CATEGORIES } from "../../modules/catalog/models/product.model.js";

type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

interface ProductFormatSeed {
  value: "standard" | "large" | "premium";
  label: string;
  priceAdjustmentCents: number;
}

interface ProductOptionValueSeed {
  externalId: string;
  label: string;
  value: string;
  priceModifierCents: number;
  colorHex?: string;
}

interface ProductOptionSeed {
  externalId: string;
  name: string;
  values: ProductOptionValueSeed[];
}

interface PrintAreaSeed {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ProductSeed {
  externalId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ProductCategory;
  basePriceCents: number;
  imageUrl: string;
  gallery: string[];
  featured: boolean;
  active: boolean;
  badge?: string;
  formats: ProductFormatSeed[];
  options: ProductOptionSeed[];
  printArea: PrintAreaSeed;
  printProviderProductId: null;
}

const formats: ProductFormatSeed[] = [
  {
    value: "standard",
    label: "Estándar",
    priceAdjustmentCents: 0,
  },
  {
    value: "large",
    label: "Grande",
    priceAdjustmentCents: 18000,
  },
  {
    value: "premium",
    label: "Premium",
    priceAdjustmentCents: 32000,
  },
];

const apparelSizes: ProductOptionSeed = {
  externalId: "size",
  name: "Talla",
  values: [
    {
      externalId: "size-s",
      label: "S",
      value: "s",
      priceModifierCents: 0,
    },
    {
      externalId: "size-m",
      label: "M",
      value: "m",
      priceModifierCents: 0,
    },
    {
      externalId: "size-l",
      label: "L",
      value: "l",
      priceModifierCents: 0,
    },
    {
      externalId: "size-xl",
      label: "XL",
      value: "xl",
      priceModifierCents: 4000,
    },
  ],
};

const textileColors: ProductOptionSeed = {
  externalId: "color",
  name: "Color",
  values: [
    {
      externalId: "color-black",
      label: "Negro",
      value: "black",
      priceModifierCents: 0,
      colorHex: "#111111",
    },
    {
      externalId: "color-bone",
      label: "Hueso",
      value: "bone",
      priceModifierCents: 0,
      colorHex: "#e7e0d2",
    },
    {
      externalId: "color-red",
      label: "Rojo",
      value: "red",
      priceModifierCents: 2000,
      colorHex: "#9d1712",
    },
  ],
};

const printFinish: ProductOptionSeed = {
  externalId: "finish",
  name: "Acabado",
  values: [
    {
      externalId: "finish-matte",
      label: "Mate",
      value: "matte",
      priceModifierCents: 0,
    },
    {
      externalId: "finish-gloss",
      label: "Brillante",
      value: "gloss",
      priceModifierCents: 4500,
    },
  ],
};

export const productSeeds: ProductSeed[] = [
  {
    externalId: "product-001",
    slug: "playera-directors-cut",
    name: "Playera Director's Cut",
    shortDescription: "Algodón pesado con impresión frontal.",
    description:
      "Playera de corte relajado en algodón de alto gramaje, creada para fotografías de alto contraste.",
    category: "apparel",
    basePriceCents: 44900,
    imageUrl:
      "https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: true,
    active: true,
    badge: "BEST FRAME",
    formats,
    options: [apparelSizes, textileColors],
    printArea: {
      top: 23,
      left: 32,
      width: 36,
      height: 42,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-002",
    slug: "hoodie-after-hours",
    name: "Hoodie After Hours",
    shortDescription: "Hoodie pesado para las sesiones nocturnas.",
    description:
      "Sudadera amplia con capucha, interior suave y área central para impresión fotográfica.",
    category: "apparel",
    basePriceCents: 84900,
    imageUrl:
      "https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: true,
    active: true,
    badge: "LIMITED",
    formats,
    options: [apparelSizes, textileColors],
    printArea: {
      top: 27,
      left: 32,
      width: 36,
      height: 35,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-003",
    slug: "tote-street-tape",
    name: "Tote Street Tape",
    shortDescription: "Bolsa de lona para cargar el archivo.",
    description:
      "Tote bag resistente de lona gruesa con impresión de gran formato.",
    category: "accessories",
    basePriceCents: 29900,
    imageUrl:
      "https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    formats,
    options: [textileColors],
    printArea: {
      top: 30,
      left: 25,
      width: 50,
      height: 45,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-004",
    slug: "gorra-frame-002",
    name: "Gorra Frame 002",
    shortDescription: "Silueta clásica con gráfico frontal.",
    description:
      "Gorra ajustable de seis paneles con aplicación visual frontal compacta.",
    category: "accessories",
    basePriceCents: 37900,
    imageUrl:
      "https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    badge: "DROP 002",
    formats,
    options: [textileColors],
    printArea: {
      top: 30,
      left: 34,
      width: 32,
      height: 22,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-005",
    slug: "poster-archive",
    name: "Póster Archive",
    shortDescription: "Impresión editorial para muro.",
    description:
      "Póster fotográfico de alta definición disponible en dos formatos.",
    category: "wall-art",
    basePriceCents: 24900,
    imageUrl:
      "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: true,
    active: true,
    formats,
    options: [
      {
        externalId: "size",
        name: "Formato",
        values: [
          {
            externalId: "poster-a3",
            label: "A3",
            value: "a3",
            priceModifierCents: 0,
          },
          {
            externalId: "poster-a2",
            label: "A2",
            value: "a2",
            priceModifierCents: 18000,
          },
        ],
      },
      printFinish,
    ],
    printArea: {
      top: 10,
      left: 18,
      width: 64,
      height: 80,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-006",
    slug: "cuadro-gallery-frame",
    name: "Cuadro Gallery Frame",
    shortDescription: "Fotografía enmarcada lista para exhibirse.",
    description:
      "Cuadro con marco negro y montaje editorial para una pieza principal.",
    category: "wall-art",
    basePriceCents: 74900,
    imageUrl:
      "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    formats,
    options: [
      {
        externalId: "size",
        name: "Tamaño",
        values: [
          {
            externalId: "frame-medium",
            label: "40 × 50 cm",
            value: "medium",
            priceModifierCents: 0,
          },
          {
            externalId: "frame-large",
            label: "60 × 80 cm",
            value: "large",
            priceModifierCents: 35000,
          },
        ],
      },
      printFinish,
    ],
    printArea: {
      top: 14,
      left: 23,
      width: 54,
      height: 70,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-007",
    slug: "case-night-block",
    name: "Case Night Block",
    shortDescription: "Protección rígida con impresión completa.",
    description:
      "Case para celular con acabado resistente y fotografía de borde a borde.",
    category: "accessories",
    basePriceCents: 32900,
    imageUrl:
      "https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    formats,
    options: [
      {
        externalId: "model",
        name: "Modelo",
        values: [
          {
            externalId: "model-iphone",
            label: "iPhone 15",
            value: "iphone-15",
            priceModifierCents: 0,
          },
          {
            externalId: "model-galaxy",
            label: "Galaxy S24",
            value: "galaxy-s24",
            priceModifierCents: 3000,
          },
        ],
      },
      printFinish,
    ],
    printArea: {
      top: 8,
      left: 20,
      width: 60,
      height: 84,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-008",
    slug: "taza-studio-session",
    name: "Taza Studio Session",
    shortDescription: "Cerámica para sesiones largas.",
    description:
      "Taza de cerámica con impresión panorámica y acabado resistente.",
    category: "objects",
    basePriceCents: 27900,
    imageUrl:
      "https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    formats,
    options: [
      {
        externalId: "color",
        name: "Interior",
        values: [
          {
            externalId: "mug-black",
            label: "Negro",
            value: "black",
            priceModifierCents: 0,
            colorHex: "#111111",
          },
          {
            externalId: "mug-red",
            label: "Rojo",
            value: "red",
            priceModifierCents: 2500,
            colorHex: "#9d1712",
          },
        ],
      },
      printFinish,
    ],
    printArea: {
      top: 27,
      left: 22,
      width: 56,
      height: 42,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-009",
    slug: "sticker-pack-contact-sheet",
    name: "Sticker Pack Contact Sheet",
    shortDescription: "Seis recortes del archivo visual.",
    description:
      "Paquete de seis stickers resistentes al agua con recortes de la fotografía elegida.",
    category: "objects",
    basePriceCents: 15900,
    imageUrl:
      "https://images.pexels.com/photos/7319070/pexels-photo-7319070.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: false,
    active: true,
    badge: "6 PIECES",
    formats,
    options: [printFinish],
    printArea: {
      top: 18,
      left: 18,
      width: 64,
      height: 64,
    },
    printProviderProductId: null,
  },
  {
    externalId: "product-010",
    slug: "libreta-production-notes",
    name: "Libreta Production Notes",
    shortDescription: "Notas, encuadres y próximas tomas.",
    description:
      "Libreta de pasta rígida con portada personalizada y papel color hueso.",
    category: "objects",
    basePriceCents: 31900,
    imageUrl:
      "https://images.pexels.com/photos/733857/pexels-photo-733857.jpeg?auto=compress&cs=tinysrgb&w=1200",
    gallery: [],
    featured: true,
    active: true,
    formats,
    options: [
      {
        externalId: "paper",
        name: "Interior",
        values: [
          {
            externalId: "paper-lined",
            label: "Rayado",
            value: "lined",
            priceModifierCents: 0,
          },
          {
            externalId: "paper-dotted",
            label: "Punteado",
            value: "dotted",
            priceModifierCents: 2000,
          },
        ],
      },
      printFinish,
    ],
    printArea: {
      top: 10,
      left: 18,
      width: 64,
      height: 80,
    },
    printProviderProductId: null,
  },
];
