// Romanian counties (județe) + Bucharest, with the exact diacritics OSM uses in
// the boundary `name` tag (admin_level=4). The dropdown sends one of these names,
// and enumerate.mjs resolves the boundary by name.
export const COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brăila", "Brașov", "București", "Buzău", "Călărași", "Caraș-Severin",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui",
  "Vrancea",
];

// OSM tourism values that map to "cazare" (accommodation) we care about.
export const TOURISM_TYPES = [
  { key: "hotel", label: "Hoteluri" },
  { key: "guest_house", label: "Pensiuni / guest house" },
  { key: "motel", label: "Moteluri" },
  { key: "chalet", label: "Cabane / chalet" },
  { key: "hostel", label: "Hosteluri" },
  { key: "apartment", label: "Apartamente de închiriat" },
  { key: "resort", label: "Resort" },
  { key: "camp_site", label: "Camping" },
];
