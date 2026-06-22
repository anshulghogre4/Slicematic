/*=====================================================
TABLE: CUSTOMER
=====================================================*/

CREATE TABLE slicematic.customer (
    customer_id UUID PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    mobile_number VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    registration_date TIMESTAMP,
    preferred_contact_channel VARCHAR(50),
    marketing_opt_in BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Stores customer demographic and contact information.

Supports:

1. Customer Profiling
2. Customer Segmentation
3. Age-Based Recommendations
4. Regional Demand Analysis
5. Marketing Campaign Targeting
6. Revenue Forecasting by Geography

EXAMPLE RECORDS

Customer 1
-----------
Name: Rahul Sharma
Age: 24
City: Bangalore

Recommendation:
Cheese Burst
Peri-Peri Drizzle

Customer 2
-----------
Name: Priya Nair
Age: 35
City: Chennai

Recommendation:
Whole Wheat
California Veggie

BUSINESS QUESTIONS ANSWERED

- Which city generates the highest revenue?
- Which age group orders most frequently?
- Which customer segment prefers premium pizzas?
-----------------------------------------------------*/


/*=====================================================
TABLE: CUSTOMER_ACTIVITY
=====================================================*/

CREATE TABLE slicematic.customer_activity (
    activity_id UUID PRIMARY KEY,
    customer_id UUID,
    activity_type VARCHAR(50),
    activity_timestamp TIMESTAMP,
    item_type VARCHAR(50),
    item_id INT,
    device_type VARCHAR(50),
    FOREIGN KEY (customer_id)
    REFERENCES customer(customer_id)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Captures customer interactions before purchase.

Acts as clickstream and behavioral tracking.

ACTIVITY TYPES

- View
- Search
- Add_To_Cart
- Remove_From_Cart
- Purchase

EXAMPLE RECORDS

Rahul viewed:
-------------
Thin Crust
Margherita
Extra Cheese

Priya searched:
---------------
Healthy Pizza

BUSINESS QUESTIONS ANSWERED

- Which pizzas are viewed but not purchased?
- Which toppings have highest interest?
- Which searches lead to purchases?
- Which items should be recommended?

ML USAGE

Primary dataset for recommendation engine training.
-----------------------------------------------------*/


/*=====================================================
TABLE: ORDERS
=====================================================*/

CREATE TABLE slicematic.orders (
    order_id UUID PRIMARY KEY,
    customer_id UUID,
    order_datetime TIMESTAMP,
    order_status VARCHAR(50),
    payment_method VARCHAR(50),
    subtotal_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    delivery_charge DECIMAL(10,2),
    final_amount DECIMAL(10,2),
    city VARCHAR(100),
    coupon_code VARCHAR(50),
    FOREIGN KEY (customer_id)
    REFERENCES customer(customer_id)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Stores order level transaction details.

One record = One customer order.

ORDER STATUS

- Placed
- Confirmed
- Preparing
- Out_For_Delivery
- Delivered
- Cancelled

PAYMENT METHODS

- UPI
- Credit Card
- Debit Card
- Wallet
- Cash

EXAMPLE RECORD

Order Value : Rs.648

Items:
Paneer Tikka
Extra Cheese
Peri-Peri Drizzle

Coupon:
PIZZA20

BUSINESS QUESTIONS ANSWERED

- Daily Revenue
- Average Order Value
- Coupon Effectiveness
- Payment Method Trends
- City Wise Sales
-----------------------------------------------------*/


/*=====================================================
TABLE: ORDER_ITEM
=====================================================*/

CREATE TABLE slicematic.order_item (
    order_item_id UUID PRIMARY KEY,
    order_id UUID,
    pizza_type_id INT,
    base_id INT,
    quantity INT,
    base_price DECIMAL(10,2),
    pizza_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    FOREIGN KEY(order_id)
    REFERENCES orders(order_id),
    FOREIGN KEY(base_id)
    REFERENCES pizza_bases(base_id),
    FOREIGN KEY(pizza_type_id)
    REFERENCES pizza_types(pizza_type_id)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Stores each pizza ordered within an order.

One order may contain multiple pizzas.

EXAMPLE

Order #1001

Pizza 1
--------
Paneer Tikka
Cheese Burst

Pizza 2
--------
Farm House
Thin Crust

BUSINESS QUESTIONS ANSWERED

- Best Selling Pizza
- Best Selling Base
- Revenue by Pizza Type
- Quantity Trends

ML USAGE

Primary input for market basket analysis.
-----------------------------------------------------*/


/*=====================================================
TABLE: ORDER_ITEM_TOPPING
=====================================================*/

CREATE TABLE slicematic.order_item_topping (
    order_item_id UUID,
    topping_id INT,
    topping_price DECIMAL(10,2),
    PRIMARY KEY(order_item_id,topping_id),
    FOREIGN KEY(order_item_id)
    REFERENCES order_item(order_item_id),
    FOREIGN KEY(topping_id)
    REFERENCES toppings(topping_id)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Stores toppings selected for a pizza.

Supports many-to-many relationship between
pizza orders and toppings.

EXAMPLE

Paneer Tikka Pizza

Selected Toppings
-----------------
Extra Cheese
Black Olives
Peri-Peri Drizzle

BUSINESS QUESTIONS ANSWERED

- Most Popular Toppings
- Topping Attach Rate
- Premium Add-on Revenue

ML USAGE

Supports recommendation engine.

Example Rule:

Customers who buy:

Paneer Tikka +
Extra Cheese

Also buy:

Peri-Peri Drizzle

Used for:
- Cross Sell
- Upsell
- Recommendation Models
-----------------------------------------------------*/


/*=====================================================
TABLE: CUSTOMER_PREFERENCE
=====================================================*/

CREATE TABLE slicematic.customer_preference (
    preference_id UUID PRIMARY KEY,
    customer_id UUID,
    preferred_base_id INT,
    preferred_pizza_type_id INT,
    preferred_topping_id INT,
    preference_score DECIMAL(5,2),
    last_updated TIMESTAMP
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Stores calculated customer preferences.

Generated from historical activity and orders.

EXAMPLE

Customer:
Rahul

Preference Scores

Cheese Burst = 9.5

Paneer Tikka = 8.8

Extra Cheese = 9.9

BUSINESS QUESTIONS ANSWERED

- What should be recommended next?
- What are customer taste profiles?
- Which customers prefer premium products?

ML USAGE

Recommendation serving layer.
-----------------------------------------------------*/


/*=====================================================
TABLE: RECOMMENDATION_EVENT
=====================================================*/

CREATE TABLE slicematic.recommendation_event (
    recommendation_id UUID PRIMARY KEY,
    customer_id UUID,
    recommended_item_type VARCHAR(50),
    recommended_item_id INT,
    recommendation_score DECIMAL(8,4),
    recommendation_timestamp TIMESTAMP,
    action_taken VARCHAR(50)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Tracks recommendation performance.

ACTION TYPES

- Shown
- Clicked
- Added_To_Cart
- Purchased
- Ignored

EXAMPLE

Recommendation:

Extra Cheese

Score:
0.92

Outcome:
Purchased

BUSINESS QUESTIONS ANSWERED

- Recommendation CTR
- Recommendation Conversion Rate
- Revenue from Recommendations

ML USAGE

Feedback loop for model improvement.

Allows continuous learning and optimization.
-----------------------------------------------------*/


/*=====================================================
TABLE: DAILY_SALES_FACT
=====================================================*/

CREATE TABLE slicematic.daily_sales_fact (
    sales_date DATE,
    pizza_type_id INT,
    total_orders INT,
    total_quantity INT,
    revenue DECIMAL(12,2),
    PRIMARY KEY (sales_date,pizza_type_id)
);

/*-----------------------------------------------------
BUSINESS PURPOSE

Aggregated fact table used by dashboard,
forecasting and simulation modules.

EXAMPLE

2026-06-20

Paneer Tikka

Orders: 245

Quantity: 312

Revenue: Rs.112,450

BUSINESS QUESTIONS ANSWERED

- Daily Revenue Trends
- Top Selling Pizza
- Seasonal Patterns
- Sales Forecasting

ML USAGE

Primary training dataset for:

1. Demand Forecasting
2. Revenue Prediction
3. Sales Simulation
4. Inventory Planning
-----------------------------------------------------*/