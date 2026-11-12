import type { Dish } from "./types";

const spice = [
  { id: "gentle", label: "温柔辣", delta: 0 },
  { id: "classic", label: "暹罗辣", delta: 0 },
  { id: "brave", label: "勇敢辣", delta: 0 },
];

export const dishes: Dish[] = [
  {
    id: "tom-yum",
    name: "冬阴功虾汤",
    thai: "ต้มยำกุ้ง",
    category: "主食",
    price: 6800,
    unit: "碗",
    description: "酸香先到，虾与香茅随后。",
    ingredients: "鲜虾 · 香茅 · 南姜 · 青柠 · 草菇",
    image: "/dishes/tomyum.webp",
    featured: true,
    available: true,
    tasting: true,
    options: [
      { id: "size", label: "碗份", choices: [{ id: "one", label: "一人碗", delta: 0 }, { id: "share", label: "两人分享", delta: 2800 }] },
      { id: "spice", label: "辣度", choices: spice },
      { id: "shrimp", label: "加料", choices: [{ id: "regular", label: "标准鲜虾", delta: 0 }, { id: "extra", label: "多加两只虾", delta: 1800 }] },
    ],
  },
  {
    id: "satay",
    name: "炭烤沙嗲鸡串",
    thai: "หมูสะเต๊ะ",
    category: "小食",
    price: 4600,
    unit: "份",
    description: "炭火边缘微焦，花生酱浓郁。",
    ingredients: "鸡腿肉 · 椰奶 · 姜黄 · 花生酱",
    image: "/dishes/satay.webp",
    featured: true,
    available: true,
    tasting: true,
    options: [
      { id: "count", label: "串数", choices: [{ id: "five", label: "5 串", delta: 0 }, { id: "ten", label: "10 串", delta: 3600 }] },
      { id: "sauce", label: "蘸酱", choices: [{ id: "peanut", label: "花生酱", delta: 0 }, { id: "lime", label: "青柠辣酱", delta: 400 }] },
    ],
  },
  {
    id: "pad-thai",
    name: "虾仁炒金边粉",
    thai: "ผัดไทยกุ้งสด",
    category: "主食",
    price: 5600,
    unit: "盘",
    description: "米粉裹着酸柑香，花生碎收尾。",
    ingredients: "鲜虾 · 河粉 · 豆芽 · 花生 · 青柠",
    image: "/dishes/padthai.webp",
    featured: true,
    available: true,
    tasting: true,
    options: [
      { id: "spice", label: "辣度", choices: spice },
      { id: "extra", label: "加料", choices: [{ id: "none", label: "经典搭配", delta: 0 }, { id: "shrimp", label: "多加鲜虾", delta: 1600 }] },
    ],
  },
  {
    id: "fish-cake",
    name: "手打泰式鱼饼",
    thai: "ทอดมันปลา",
    category: "小食",
    price: 4200,
    unit: "份",
    description: "外层金黄，里面留着鱼肉弹性。",
    ingredients: "鱼肉 · 红咖喱 · 柠檬叶 · 黄瓜蘸汁",
    image: "/dishes/fishcake.webp",
    featured: false,
    available: true,
    tasting: true,
    options: [
      { id: "count", label: "件数", choices: [{ id: "four", label: "4 件", delta: 0 }, { id: "eight", label: "8 件", delta: 3200 }] },
      { id: "sauce", label: "蘸汁", choices: [{ id: "cucumber", label: "黄瓜酸甜汁", delta: 0 }, { id: "chili", label: "多加甜辣酱", delta: 300 }] },
    ],
  },
  {
    id: "papaya",
    name: "青木瓜沙拉",
    thai: "ส้มตำไทย",
    category: "小食",
    price: 3800,
    unit: "碗",
    description: "脆、酸、辣，在一碗里一起发生。",
    ingredients: "青木瓜 · 长豆 · 番茄 · 花生 · 青柠",
    image: "/dishes/papaya.webp",
    featured: false,
    available: false,
    tasting: true,
    options: [{ id: "spice", label: "辣度", choices: spice }],
  },
  {
    id: "mango-rice",
    name: "芒果椰浆糯米饭",
    thai: "ข้าวเหนียวมะม่วง",
    category: "甜点",
    price: 3600,
    unit: "盘",
    description: "熟芒果、温糯米与一点椰浆。",
    ingredients: "熟芒果 · 糯米 · 椰浆 · 斑斓叶",
    image: "/dishes/mango.webp",
    featured: false,
    available: true,
    tasting: true,
    options: [
      { id: "mango", label: "芒果", choices: [{ id: "regular", label: "标准芒果", delta: 0 }, { id: "extra", label: "多加半颗", delta: 1200 }] },
      { id: "cream", label: "椰浆", choices: [{ id: "regular", label: "标准椰浆", delta: 0 }, { id: "light", label: "少椰浆", delta: 0 }] },
    ],
  },
];

export const categories = ["招牌", "主食", "小食", "甜点"] as const;

export function getDish(id: string) {
  const dish = dishes.find((item) => item.id === id);
  if (!dish) throw new Error(`未知菜品：${id}`);
  return dish;
}

export function money(minor: number) {
  return `¥${(minor / 100).toFixed(2)}`;
}
