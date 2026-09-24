import type { DESIGN_CATEGORIES } from "../../modules/catalog/models/design.model.js";

type DesignCategory = (typeof DESIGN_CATEGORIES)[number];

export interface DesignSeed {
  externalId: string;
  slug: string;
  title: string;
  description: string;
  category: DesignCategory;
  imageUrl: string;
  photographer: string;
  photographerUrl: string;
  featured: boolean;
  active: boolean;
  drop: string;
  tags: string[];
  printProviderFileId: null;
}

export const designSeeds: DesignSeed[] = [
  {
    externalId: "design-001",
    slug: "after-hours",
    title: "After Hours",
    description:
      "Luces rojas, humo y energía contenida antes de subir al escenario.",
    category: "backstage",
    imageUrl:
      "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Wendy Wei",
    photographerUrl: "https://www.pexels.com/@wendywei/",
    featured: true,
    active: true,
    drop: "DROP 002",
    tags: ["backstage", "red light", "night"],
    printProviderFileId: null,
  },
  {
    externalId: "design-002",
    slug: "front-row-pressure",
    title: "Front Row Pressure",
    description:
      "La presión del público capturada desde el centro del concierto.",
    category: "concert",
    imageUrl:
      "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Thibault Trillet",
    photographerUrl: "https://www.pexels.com/@thibault-trillet-167491/",
    featured: true,
    active: true,
    drop: "DROP 002",
    tags: ["concert", "crowd", "live"],
    printProviderFileId: null,
  },
  {
    externalId: "design-003",
    slug: "concrete-flow",
    title: "Concrete Flow",
    description:
      "Movimiento urbano entre concreto, sombras duras y ritmo callejero.",
    category: "street",
    imageUrl:
      "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Djordje Petrovic",
    photographerUrl: "https://www.pexels.com/@djordje-petrovic-590080/",
    featured: false,
    active: true,
    drop: "STREET ARCHIVE",
    tags: ["street", "concrete", "movement"],
    printProviderFileId: null,
  },
  {
    externalId: "design-004",
    slug: "booth-session",
    title: "Booth Session",
    description:
      "Una sesión nocturna en cabina donde cada toma queda registrada.",
    category: "studio",
    imageUrl:
      "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Pixabay",
    photographerUrl: "https://www.pexels.com/@pixabay/",
    featured: true,
    active: true,
    drop: "STUDIO TAPES",
    tags: ["studio", "recording", "session"],
    printProviderFileId: null,
  },
  {
    externalId: "design-005",
    slug: "low-angle",
    title: "Low Angle",
    description:
      "Retrato frontal con actitud, contraste y encuadre de video musical.",
    category: "portrait",
    imageUrl:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Pixabay",
    photographerUrl: "https://www.pexels.com/@pixabay/",
    featured: false,
    active: true,
    drop: "PORTRAIT FILES",
    tags: ["portrait", "artist", "frame"],
    printProviderFileId: null,
  },
  {
    externalId: "design-006",
    slug: "night-block",
    title: "Night Block",
    description:
      "La ciudad después de medianoche vista como un fotograma perdido.",
    category: "street",
    imageUrl:
      "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=1200",
    photographer: "Lukas Kloeppel",
    photographerUrl: "https://www.pexels.com/@lukas-kloeppel-466685/",
    featured: false,
    active: true,
    drop: "CITY ARCHIVE",
    tags: ["night", "city", "street"],
    printProviderFileId: null,
  },
];
