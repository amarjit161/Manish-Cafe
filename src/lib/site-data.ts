export const SITE_NAME = "Manish Cafe & Cyber Zone";

export const NAV_LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/gaming", label: "Gaming House", icon: "sports_esports" },
  { href: "/seva", label: "Online Seva", icon: "description" },
  { href: "/courses", label: "Skill Courses", icon: "school" },
] as const;

export const SEVA_SERVICES = [
  { id: "aadhar-update", name: "Aadhar Card Update", icon: "badge" },
  { id: "pan-application", name: "PAN Card Application", icon: "account_balance" },
  { id: "income-certificate", name: "Income Certificate", icon: "description" },
  { id: "caste-certificate", name: "Caste Certificate", icon: "assignment" },
  { id: "domicile-certificate", name: "Domicile Certificate", icon: "home_work" },
  { id: "passport-assistance", name: "Passport Application Assistance", icon: "flight" },
  { id: "voter-id", name: "Voter ID Registration / Correction", icon: "how_to_vote" },
  { id: "ration-card", name: "Ration Card Services", icon: "receipt_long" },
] as const;

export const COURSES = [
  {
    id: "tally-prime",
    name: "Advanced Tally PRIME",
    duration: "2 Months",
    fee: 3500,
    icon: "calculate",
  },
  {
    id: "ms-office",
    name: "MS Office Advance",
    duration: "1.5 Months",
    fee: 2500,
    icon: "description",
  },
  {
    id: "python-beginners",
    name: "Python for Beginners",
    duration: "2 Months",
    fee: 4000,
    icon: "code",
  },
  {
    id: "digital-marketing",
    name: "Digital Marketing",
    duration: "3 Months",
    fee: 6000,
    icon: "campaign",
  },
  {
    id: "basic-computer",
    name: "Basic Computer Course (CCC)",
    duration: "1 Month",
    fee: 1500,
    icon: "computer",
  },
  {
    id: "graphic-design",
    name: "Graphic Design (Photoshop / CorelDraw)",
    duration: "2 Months",
    fee: 4500,
    icon: "palette",
  },
] as const;

export const CAFE_OPEN_HOUR = 9;
export const CAFE_CLOSE_HOUR = 23;
