export const SESSION_STORAGE_KEYS = {
  adminViewCustomer: "slicematic_admin_view_customer",
  customer: "slicematic_customer",
  customerEmail: "slicematic_customer_email",
  customerId: "slicematic_customer_id",
  customerLoggedIn: "slicematic_customer_logged_in",
  isAdmin: "slicematic_is_admin",
  refreshOrders: "slicematic_refresh_orders",
  workspace: "slicematic_workspace",
  zustandStore: "slicematic-storage",
} as const;

export const LOCAL_STORAGE_KEYS = {
  cashfreePending: "cf_pending",
  mockCustomers: "slicematic_mock_customers",
} as const;

export type SessionStorageKey = (typeof SESSION_STORAGE_KEYS)[keyof typeof SESSION_STORAGE_KEYS];
export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];
