import { AdminSummary, ForecastPoint, MenuPayload, SavedOrder } from "./types";

export const seedMenu: MenuPayload = {
  pizzas: [
    {
      id: 1,
      code: "P1",
      name: "Margherita",
      price: 299,
      description: "Tomato sauce, mozzarella, basil finish, and a crisp city-style bite.",
      image: "/assets/menu/P1.jpg",
      badge: "Fastest bake",
      tags: ["Veg", "Classic", "Cheese"],
      prepMinutes: 18,
      available: true
    },
    {
      id: 2,
      code: "P2",
      name: "Chicago Deep Dish",
      price: 349,
      description: "Tall crust, chunky sauce, slow-melted cheese, and a generous filling.",
      image: "/assets/menu/P2.jpg",
      badge: "Loaded",
      tags: ["Cheese", "Hearty", "Signature"],
      prepMinutes: 28,
      available: true
    },
    {
      id: 3,
      code: "P3",
      name: "Greek Mediterranean",
      price: 329,
      description: "Olives, peppers, tomatoes, herbs, and a balanced mozzarella layer.",
      image: "/assets/menu/P3.jpg",
      badge: "Herb forward",
      tags: ["Veg", "Olives", "Fresh"],
      prepMinutes: 22,
      available: true
    },
    {
      id: 4,
      code: "P4",
      name: "California Veggie",
      price: 339,
      description: "Colorful vegetables, bright sauce, and a clean finish for repeat orders.",
      image: "/assets/menu/P4.jpg",
      badge: "Garden pick",
      tags: ["Veg", "Light", "Peppers"],
      prepMinutes: 21,
      available: true
    },
    {
      id: 5,
      code: "P5",
      name: "Farm House",
      price: 319,
      description: "Mushrooms, corn, peppers, onions, and cheese on a familiar crowd favorite.",
      image: "/assets/menu/P5.jpg",
      badge: "Best value",
      tags: ["Veg", "Corn", "Mushroom"],
      prepMinutes: 24,
      available: true
    },
    {
      id: 6,
      code: "P6",
      name: "Pepperoni Classic",
      price: 369,
      description: "Pepperoni-style slices, mozzarella, oregano, and a rich tomato base.",
      image: "/assets/menu/P6.jpg",
      badge: "High protein",
      tags: ["Chicken", "Classic", "Spiced"],
      prepMinutes: 23,
      available: true
    },
    {
      id: 7,
      code: "P7",
      name: "BBQ Chicken",
      price: 379,
      description: "Barbecue chicken, onions, peppers, and a sweet-smoky sauce drizzle.",
      image: "/assets/menu/P7.jpg",
      badge: "Smoky",
      tags: ["Chicken", "BBQ", "Smoky"],
      prepMinutes: 25,
      available: true
    },
    {
      id: 8,
      code: "P8",
      name: "Paneer Tikka",
      price: 349,
      description: "Tikka-spiced paneer, onions, peppers, and a masala sauce base.",
      image: "/assets/menu/P8.jpg",
      badge: "Local favorite",
      tags: ["Veg", "Paneer", "Spicy"],
      prepMinutes: 24,
      available: true
    }
  ],
  bases: [
    { id: 1, code: "B1", name: "Thin Crust", price: 149, description: "Light, crisp edge", available: true },
    { id: 2, code: "B2", name: "Thick Crust", price: 179, description: "Soft, filling bite", available: true },
    { id: 3, code: "B3", name: "Cheese Burst", price: 229, description: "Molten cheese layer", available: true },
    { id: 4, code: "B4", name: "Whole Wheat", price: 159, description: "Nutty, everyday base", available: true },
    { id: 5, code: "B5", name: "Multigrain", price: 169, description: "Seeded texture", available: true }
  ],
  toppings: [
    { id: 1, code: "T1", name: "Black Olives", price: 49, available: true },
    { id: 2, code: "T2", name: "Extra Cheese", price: 69, available: true },
    { id: 3, code: "T3", name: "Button Mushrooms", price: 49, available: true },
    { id: 4, code: "T4", name: "Green Peppers", price: 39, available: true },
    { id: 5, code: "T5", name: "Jalapenos", price: 39, available: true },
    { id: 6, code: "T6", name: "Sun-Dried Tomatoes", price: 59, available: true },
    { id: 7, code: "T7", name: "Caramelised Onions", price: 49, available: true },
    { id: 8, code: "T8", name: "Sweet Corn", price: 39, available: true },
    { id: 9, code: "T9", name: "Roasted Garlic", price: 49, available: true },
    { id: 10, code: "T10", name: "Peri-Peri Drizzle", price: 59, available: true }
  ],
  sizes: [
    { id: "regular", name: "Regular", extra: 0, detail: "Serves 1-2", available: true },
    { id: "large", name: "Large", extra: 120, detail: "Serves 2-3", available: true },
    { id: "party", name: "Party", extra: 220, detail: "Serves 3-4", available: true }
  ]
};

export const seedOrders: SavedOrder[] = [
  {
    id: "SM-100284",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    customerName: "Aarav Sharma",
    phone: "9876543210",
    paymentMode: "UPI",
    status: "Delivered",
    subtotal: 1836,
    discount: 0,
    gst: 330.48,
    finalTotal: 2166.48,
    lines: [
      {
        pizzaName: "Paneer Tikka",
        baseName: "Cheese Burst",
        sizeName: "Large",
        toppings: ["Extra Cheese", "Jalapenos"],
        quantity: 2,
        lineTotal: 1836
      }
    ]
  },
  {
    id: "SM-100192",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    customerName: "Nisha Verma",
    phone: "9876500007",
    paymentMode: "Card",
    status: "Delivered",
    subtotal: 3385,
    discount: 338.5,
    gst: 548.37,
    finalTotal: 3594.87,
    lines: [
      {
        pizzaName: "BBQ Chicken",
        baseName: "Cheese Burst",
        sizeName: "Regular",
        toppings: ["Extra Cheese"],
        quantity: 5,
        lineTotal: 3385
      }
    ]
  },
  {
    id: "SM-100041",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    customerName: "Kabir Mehta",
    phone: "9876500002",
    paymentMode: "Cash",
    status: "Delivered",
    subtotal: 1164,
    discount: 0,
    gst: 209.52,
    finalTotal: 1373.52,
    lines: [
      {
        pizzaName: "Farm House",
        baseName: "Thin Crust",
        sizeName: "Regular",
        toppings: ["Sweet Corn"],
        quantity: 2,
        lineTotal: 1014
      }
    ]
  }
];

export const seedForecast: ForecastPoint[] = [
  { label: "Fri 19:00", predictedOrders: 18 },
  { label: "Sat 20:00", predictedOrders: 25 },
  { label: "Sun 13:00", predictedOrders: 19 },
  { label: "Mon 20:00", predictedOrders: 13 },
  { label: "Tue 19:00", predictedOrders: 12 },
  { label: "Wed 21:00", predictedOrders: 14 },
  { label: "Thu 20:00", predictedOrders: 16 }
];

export const seedForecastMeta = {
  model: "RandomForestRegressor",
  features: ["weekday", "hour"],
  rmse: 1.84,
  trainedAt: "2026-01-15T18:00:00+05:30",
  orderCount: seedOrders.length,
  bucketCount: 24
};

export const seedTopPeaks: ForecastPoint[] = [...seedForecast]
  .sort((a, b) => b.predictedOrders - a.predictedOrders)
  .slice(0, 3);

export function buildSeedSummary(): AdminSummary {
  const totalRevenue = seedOrders.reduce((sum, order) => sum + order.finalTotal, 0);
  return {
    totalRevenue,
    orderCount: seedOrders.length,
    avgOrderValue: totalRevenue / seedOrders.length,
    topPizza: "Paneer Tikka",
    busiestHour: "20:00",
    paymentMix: [
      { mode: "UPI", count: 1, revenue: seedOrders[0].finalTotal },
      { mode: "Card", count: 1, revenue: seedOrders[1].finalTotal },
      { mode: "Cash", count: 1, revenue: seedOrders[2].finalTotal }
    ],
    hourlyDemand: [
      { hour: "12:00", orders: 7, revenue: 5900 },
      { hour: "13:00", orders: 10, revenue: 8700 },
      { hour: "19:00", orders: 16, revenue: 14300 },
      { hour: "20:00", orders: 22, revenue: 19100 },
      { hour: "21:00", orders: 14, revenue: 12600 }
    ],
    recentOrders: seedOrders,
    forecast: seedForecast,
    topPeaks: seedTopPeaks,
    forecastMeta: seedForecastMeta
  };
}
