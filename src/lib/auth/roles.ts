export type AppRole = "customer" | "retailer" | "admin";

export const PORTAL_HOME: Record<AppRole, string> = {
  customer: "/customer",
  retailer: "/retailer",
  admin: "/admin/dashboard",
};

export const PORTAL_LOGIN: Record<AppRole, string> = {
  customer: "/customer/login",
  retailer: "/retailer/login",
  admin: "/admin/dashboard/login",
};
