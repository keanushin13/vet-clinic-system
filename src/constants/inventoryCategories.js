export const INVENTORY_CATEGORY_OPTIONS = [
  { value: "Vaccines", label: "Vaccines" },
  { value: "TestKits", label: "Test Kits" },
  { value: "Antibiotics", label: "Antibiotics" },
  { value: "Supplements", label: "Supplements" },
  { value: "EyeDrops", label: "Eye Drops" },
  { value: "EarDrops", label: "Ear Drops" },
  { value: "AntiParasite", label: "Anti Parasite" },
  { value: "AntiInflammatory", label: "Anti Inflammatory" },
  { value: "FoodSupplements", label: "Food Supplements" },
  { value: "ShampooAndSoap", label: "Shampoo & Soap" },
  { value: "Others", label: "Others" },
];

const CATEGORY_LABELS = {
  Vaccines: "Vaccines",
  TestKits: "Test Kits",
  Antibiotics: "Antibiotics",
  Supplements: "Supplements",
  EyeDrops: "Eye Drops",
  EarDrops: "Ear Drops",
  AntiParasite: "Anti Parasite",
  AntiInflammatory: "Anti Inflammatory",
  FoodSupplements: "Food Supplements",
  ShampooAndSoap: "Shampoo & Soap",
  Others: "Others",
};

const LEGACY_CATEGORY_TO_CURRENT = {
  Vaccine: "Vaccines",
  Grooming: "ShampooAndSoap",
};

export const formatInventoryCategory = (category) => {
  if (!category) return "-";
  return CATEGORY_LABELS[category] || category;
};

export const normalizeInventoryCategory = (category) => {
  if (!category) return "Others";

  const match = INVENTORY_CATEGORY_OPTIONS.find(
    (option) => option.value === category,
  );
  if (match) return match.value;

  return LEGACY_CATEGORY_TO_CURRENT[category] || "Others";
};
