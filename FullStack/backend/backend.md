Here is the comprehensive backend architectural blueprint and technical specification for the SliceMatic ordering system.

# Project Overview

The SliceMatic ordering system is a digital platform designed for a single-outlet pizza delivery brand in New Ashok Nagar, Delhi. The system transitions the business from manual phone orders to a fully automated digital flow handling customer intake, menu selection, pricing, discounts, GST, payment, and order persistence. This backend architecture utilizes Python and Supabase to create a production-grade, full-stack application supporting robust business logic, role-based admin access, and AI integrations via OpenRouter.

# System Architecture

The backend architecture employs **FastAPI (Python 3.10+)** as the primary orchestration and business logic layer, operating alongside **Supabase (PostgreSQL)**. This structure ensures a strict Separation of Concerns (SoC).

* **API Layer (FastAPI):** Exposes asynchronous RESTful endpoints. It handles HTTP requests, input validation via Pydantic, and routes traffic to the appropriate service modules.
* **Service Layer (Python):** Contains the core business logic. This includes calculating the 10% discount for orders of 5 or more pizzas, applying the 18% GST, and orchestrating prompts to the OpenRouter API.


* **Data Access Layer (Supabase Python SDK):** Executes queries against the PostgreSQL database using `supabase-py`.
* 
**Identity & Access Management (Supabase Auth):** Handles secure JWT-based authentication for the admin dashboard.



# Directory Structure

```text
slice_matic_backend/
├── app/
│   ├── main.py                     # FastAPI application instance and middleware setup
│   ├── api/
│   │   ├── dependencies.py         # Auth extraction and database client injection
│   │   └── controllers/            # Route definitions (HTTP request/response)
│   │       ├── menu_router.py
│   │       ├── order_router.py
│   │       ├── admin_router.py
│   │       └── ai_router.py
│   ├── core/
│   │   ├── config.py               # Environment variables (OpenRouter, Supabase keys)
│   │   ├── security.py             # JWT validation and RBAC utilities
│   │   └── services/               # Core business logic
│   │       ├── menu_service.py
│   │       ├── order_service.py
│   │       ├── admin_service.py
│   │       └── ai_service.py
│   ├── schemas/
│   │   ├── pydantic/               # Data validation and serialization models
│   │   │   ├── menu_schemas.py
│   │   │   ├── order_schemas.py
│   │   │   └── auth_schemas.py
│   └── supabase/
│       ├── client.py               # Supabase connection singleton
│       └── migrations/             # SQL files for schema and RLS setup
├── requirements.txt
└── README.md

```

# Database Schema & RLS Policies

The database must include separate tables for menus, orders, and order line items.

### PostgreSQL Tables

* **`menus`**: Stores menu items parsed from the original text files.
* Columns: `id` (UUID), `item_type` (Enum: BASE, PIZZA, TOPPING), `name` (Text), `price` (Numeric).


* **`customers`**: Stores customer intake data.
* Columns: `id` (UUID), `name` (Text), `phone` (Text, 10 digits).


* **`orders`**: Stores the order summary and financial breakdown.
* Columns: `id` (UUID), `customer_id` (UUID, FK), `status` (Text), `quantity` (Int), `subtotal` (Numeric), `discount_amount` (Numeric), `gst_amount` (Numeric), `final_total` (Numeric), `payment_mode` (Enum: CASH, CARD, UPI), `created_at` (Timestamp).




* **`order_line_items`**: Maps individual pizzas and toppings to a specific order.
* Columns: `id` (UUID), `order_id` (UUID, FK), `menu_item_id` (UUID, FK), `unit_price` (Numeric).



### Row-Level Security (RLS) Policies

1. **`menus` Table:**
* *Policy:* Allow read access to `anon` (anonymous) and `authenticated` roles.
* *Policy:* Restrict insert/update/delete strictly to the `service_role` (FastAPI backend) or Admin users.


2. **`orders` & `order_line_items` Tables:**
* *Policy:* Allow insert access to `anon` (to allow unauthenticated users to place orders).
* *Policy:* Restrict read access to the specific customer (if using a session ID) or exclusively to the `authenticated` Admin role.


3. **`customers` Table:**
* *Policy:* Allow insert to `anon`. Allow read only to Admin.



# API Controllers (Routing)

| Endpoint | Method | Controller | Description |
| --- | --- | --- | --- |
| `/api/v1/menu` | `GET` | `menu_router.py` | Retrieves available bases, pizzas, and toppings. |
| `/api/v1/orders/validate` | `POST` | `order_router.py` | Validates customer input, pricing, and returns a generated bill breakdown. |
| `/api/v1/orders/place` | `POST` | `order_router.py` | Finalizes the order and persists it to the Supabase database. |
| `/api/v1/admin/dashboard` | `GET` | `admin_router.py` | Requires Admin JWT. Returns aggregated order stats, top-selling items, and revenue. |
| `/api/v1/admin/export` | `GET` | `admin_router.py` | Requires Admin JWT. Returns a CSV format of the `orders` table.

 |
| `/api/v1/ai/recommend` | `POST` | `ai_router.py` | Triggers the OpenRouter API to provide AI-based pizza recommendations.

 |

# Business Logic (Services)

* **`order_service.py`**: Enforces strict domain rules. It validates that pizza quantity is an integer between 1 and 10. It calculates the 10% discount automatically when the quantity is 5 or greater. It calculates the 18% GST strictly on the post-discount total.


* 
**`menu_service.py`**: Interacts with the Supabase client to fetch menu items, ensuring no hardcoded prices exist in the application layer.


* 
**`admin_service.py`**: Aggregates data for the post-login view, filtering by date and payment mode, and calculating the busiest hour of the day.


* **`ai_service.py`**: Formats the system prompt, handles communication with the OpenRouter API, and structures the LLM response for frontend consumption.

# Security & Compliance Checklist

* 
**Input Validation (Pydantic):** * Name: Restrict to alphabets and spaces only, min 2 characters, max 40 characters.


* Phone: Exact 10-digit regex, must start with 6, 7, 8, or 9.


* Payment Mode: Enum validation accepting only Cash, Card, or UPI.




* **Authentication & IAM:** All `/api/v1/admin/*` endpoints must explicitly extract and verify the Supabase JWT. Reject any requests lacking the appropriate Admin role claims.
* **Key Management:** The frontend must only possess the Supabase `anon` key. The FastAPI backend will hold the `service_role` key to securely write complex transactions and execute admin queries without exposing elevated privileges to the client.
* **SQL Injection Prevention:** Avoid raw SQL strings. Strictly use the parameterized query methods provided by the `supabase-py` SDK or SQLAlchemy (if used as an ORM abstraction).
* 
**Error Handling:** Ensure API controllers catch all domain exceptions and return sanitized standard HTTP error codes (e.g., 400 Bad Request) without leaking internal Python stack traces or database schema details.



# Development Milestones

1. **Environment Setup:** Initialize FastAPI project, configure Supabase project, and establish `supabase-py` connection. Set up OpenRouter API keys.
2. **Schema & Migrations:** Write and execute SQL scripts in Supabase to create the core tables (`menus`, `customers`, `orders`, `order_line_items`) and apply all RLS policies.
3. 
**Data Ingestion:** Create an initial seed script to parse the provided `.txt` files (bases, pizzas, toppings) and populate the `menus` table in Supabase.


4. **Core Services Construction:** Implement Pydantic validation schemas and the `order_service.py` logic (discount thresholds, GST math).
5. **API Development:** Expose FastAPI routes for frontend consumption (menu fetching, order placement).
6. **Admin & AI Integration:** Implement Supabase Auth middleware for admin routes, build the dashboard aggregation logic, and construct the `ai_service.py` integration with OpenRouter.
7. 
**Security Audit & Deployment:** Review RLS policies, ensure Pydantic edge cases (e.g., negative quantities, invalid phone prefixes) are handled gracefully , and deploy the backend.