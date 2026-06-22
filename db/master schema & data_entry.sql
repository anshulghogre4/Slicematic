create schema slicematic;
----------------------------------------
CREATE TABLE slicematic.pizza_bases (
    base_id INT PRIMARY KEY,
    base_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
INSERT INTO slicematic.pizza_bases (base_id, base_name, price)
VALUES
(1, 'Thin Crust', 149),
(2, 'Thick Crust', 169),
(3, 'Cheese Burst', 229),
(4, 'Whole Wheat', 189),
(5, 'Multigrain', 199);
--------------------------------------------------
CREATE TABLE slicematic.pizza_types (
    pizza_type_id INT PRIMARY KEY,
    pizza_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
INSERT INTO slicematic.pizza_types (pizza_type_id, pizza_name, price)
VALUES
(1, 'Margherita', 299),
(2, 'Chicago Deep Dish', 379),
(3, 'Greek Mediterranean', 349),
(4, 'Farm House', 329),
(5, 'Pepperoni Classic', 369),
(6, 'BBQ Chicken', 379),
(7, 'Paneer Tikka', 339),
(8, 'California Veggie', 349);
-----------------------------------------------
CREATE TABLE slicematic.toppings (
    topping_id INT PRIMARY KEY,
    topping_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
INSERT INTO slicematic.toppings (topping_id, topping_name, price)
VALUES
(1, 'Black Olives', 39),
(2, 'Extra Cheese', 69),
(3, 'Mushrooms', 49),
(4, 'Green Peppers', 39),
(5, 'Jalapenos', 49),
(6, 'Sun-Dried Tomatoes', 59),
(7, 'Caramelised Onions', 49),
(8, 'Sweet Corn', 39),
(9, 'Roasted Garlic', 59),
(10, 'Peri-Peri Drizzle', 69);
-------------------------------------------------------