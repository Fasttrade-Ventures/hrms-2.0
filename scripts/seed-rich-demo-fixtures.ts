export const JOIN_DATE = "2026-05-01";
export const SEED_TAG = "rich_demo_v1";

export const MALAYSIAN_FIRST_NAMES = [
  "Ahmad",
  "Siti",
  "Muhammad",
  "Nurul",
  "Hafiz",
  "Aina",
  "Farid",
  "Syafiq",
  "Amira",
  "Daniel",
  "Priya",
  "Wei Ming",
  "Kavitha",
  "Arif",
  "Zara",
  "Irfan",
  "Mei Ling",
  "Raj",
  "Hana",
  "Iman",
  "Yusuf",
  "Liyana",
  "Adam",
  "Sofea",
  "Hakim",
  "Nadia",
  "Faiz",
  "Qistina",
  "Luqman",
  "Balqis",
  "Izzat",
  "Sarah",
  "Khairul",
  "Nabila",
  "Harith",
  "Alya",
  "Firdaus",
  "Damia",
  "Azman",
  "Hannah",
  "Rizal",
  "Puteri",
  "Syahir",
  "Alia",
  "Zulkifli",
  "Emily",
  "Vikram",
  "Jasmine",
  "Omar",
  "Felicia",
];

export const MALAYSIAN_LAST_NAMES = [
  "Abdullah",
  "Rahman",
  "Hassan",
  "Ibrahim",
  "Tan",
  "Lee",
  "Wong",
  "Kumar",
  "Singh",
  "Lim",
  "Ismail",
  "Yusof",
  "Ali",
  "Ng",
  "Chong",
  "Zainal",
  "Hamid",
  "Othman",
  "Gopal",
  "Menon",
];

export const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "QA Engineer",
  "Business Analyst",
  "HR Executive",
  "HR Manager",
  "Accountant",
  "Finance Executive",
  "Sales Executive",
  "Marketing Executive",
  "Operations Coordinator",
  "Admin Executive",
  "Customer Support Specialist",
  "Product Manager",
  "UI Designer",
  "Data Analyst",
  "Warehouse Supervisor",
  "Procurement Officer",
  "Legal Executive",
  "Executive Assistant",
];

export const DEPARTMENT_NAMES = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Sales",
  "Operations",
  "Marketing",
  "Customer Success",
];

export const BANKS = ["Maybank", "CIMB", "Public Bank", "RHB", "Hong Leong Bank", "AmBank"];
export const STATES = ["Wilayah Persekutuan", "Selangor", "Johor", "Penang", "Negeri Sembilan"];
export const CITIES = ["Kuala Lumpur", "Petaling Jaya", "Shah Alam", "Seremban", "George Town"];
export const RACES = ["Malay", "Chinese", "Indian", "Bumiputera Sabah", "Other"];
export const RELIGIONS = ["Islam", "Buddhism", "Christianity", "Hinduism", "Other"];

export function pad(num: number, size: number): string {
  return String(num).padStart(size, "0");
}

export function icNumber(index: number, birthYear = 1990): string {
  const yy = String(birthYear).slice(-2);
  const mm = pad((index % 12) + 1, 2);
  const dd = pad((index % 28) + 1, 2);
  const pb = pad((index % 14) + 1, 2);
  const serial = pad(1000 + index, 4);
  return `${yy}${mm}${dd}-${pb}-${serial}`;
}

export function dateOfBirth(index: number): string {
  const year = 1978 + (index % 25);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return `${year}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function phoneNumber(index: number): string {
  return `+601${pad(20000000 + index, 8)}`;
}

export function basicSalary(index: number): number {
  const salaries = [2800, 3200, 3500, 3800, 4000, 4200, 4500, 4800, 5000, 5200, 5500, 6000, 6500, 7200, 8000, 9500];
  return salaries[index % salaries.length];
}

export function pick<T>(items: T[], index: number): T {
  return items[index % items.length] as T;
}

export function fullName(index: number): string {
  return `${pick(MALAYSIAN_FIRST_NAMES, index)} ${pick(MALAYSIAN_LAST_NAMES, index + 3)}`;
}

export function weekdaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
