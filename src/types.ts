export type OptionChoice = {
  id: string;
  label: string;
  delta: number;
};

export type OptionGroup = {
  id: string;
  label: string;
  choices: OptionChoice[];
};

export type Dish = {
  id: string;
  name: string;
  thai: string;
  category: "主食" | "小食" | "甜点";
  price: number;
  unit: string;
  description: string;
  ingredients: string;
  image: string;
  featured: boolean;
  available: boolean;
  tasting: boolean;
  options: OptionGroup[];
};

export type CartLine = {
  key: string;
  dishId: string;
  choices: Record<string, string>;
  note: string;
  quantity: number;
};

export type Receipt = {
  id: string;
  createdAt: string;
  lines: CartLine[];
  total: number;
  mode: "dine-in" | "takeaway";
  guests: number;
  table: string;
};

export type Session = {
  mode: "dine-in" | "takeaway";
  guests: number;
  table: string;
  lines: CartLine[];
  receipt: Receipt | null;
};

export type Settings = {
  sound: boolean;
  reducedMotion: boolean;
  autoRotate: boolean;
};
