# 🔐 SliceMatic — Auth Flows

---

## Customer Auth

### Login Methods
1. **Password** (Supabase email+password)
2. **OTP** (Passwordless — email OTP or SMS OTP)

```typescript
type CustomerAuthMethod = "password" | "otp"
type CustomerOtpChannel = "email" | "sms"
type CustomerAuthView = "login" | "forgot" | "reset"
```

### Customer Login Flow (Password)
```
Enter email + password
  ↓
Supabase signInWithPassword()
  ↓ success
Set sessionStorage:
  slicematic_customer_logged_in = "true"
  slicematic_customer_email = email
  slicematic_customer_id = UUID
  slicematic_customer = JSON(CustomerDetails)
  ↓
Zustand store updated with customer data
  ↓
Auto-fire recommendation if phone in session
  ↓
Workspace = "customer" or "account"
```

### Customer OTP Flow (Passwordless)
```
Enter email or phone
  ↓
Supabase signInWithOtp({ email }) or signInWithOtp({ phone })
  ↓
OTP sent
  ↓
User enters OTP code
  ↓
Supabase verifyOtp()
  ↓
Same session setup as password login
```

### Customer Logout
```
customerLogout()
  ↓
Supabase signOut()
  ↓
Clear sessionStorage keys
  ↓
Zustand resetSession()
  ↓
Redirect to / (EntryPortal)
```

### Password Recovery (Customer)
```
URL: /?customerReset=true
  ↓
setCustomerAuthView("reset")
  ↓
User sets new password
  ↓
Supabase updateUser({ password })
```

---

## Admin Auth

### Admin Login Flow
```
Enter email + password
  ↓
POST /api/admin/login (or local demo check)
  ↓ success
Set sessionStorage:
  slicematic_is_admin = "true"
  ↓
router.replace("/admin-dashboard")
```

### Admin Password Recovery
```
URL: /?reset=true OR hash includes "type=recovery"
  ↓
setAdminAuthView("reset")
  ↓
Set new password
```

### Admin "View as Customer"
```
sessionStorage: slicematic_admin_view_customer = "true"
  ↓
Admin sees customer workspace (not redirected to /admin-dashboard)
  ↓
EntryPortal not shown
```

---

## Guest Mode

```
EntryPortal → "Order as Guest"
  ↓
sessionStorage: slicematic_customer_logged_in = "false"
  ↓
SliceMaticStage3 loads with step = "intake"
  ↓
No customer account features available
  ↓
Payment restricted: UPI or Card only (no Cash unless guestCashAllowed)
```

---

## Demo Credentials

```
Admin:    NEXT_PUBLIC_DEMO_ADMIN_EMAIL / NEXT_PUBLIC_DEMO_ADMIN_PASSWORD
Customer: customer@slicematic.in / slice-customer
```

Both stored in `.env`. Never hardcode in source.

---

## Auth State in SessionStorage

```
slicematic_customer_logged_in  "true" | "false" | null
slicematic_is_admin            "true" | null
slicematic_admin_view_customer "true" | null
slicematic_customer_email      string | null
slicematic_customer_id         UUID | null
slicematic_customer            JSON CustomerDetails | null
```

`null` = key not present = first visit (show EntryPortal)  
`"false"` = explicitly guest  
`"true"` = logged in

---

*Last updated: 2026-07-06*
