-- Fast Food Database Seed Data
-- This file contains initial data for testing

-- Create admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
VALUES ('Admin', 'User', 'admin@fastfood.com', '+1234567890', '$2a$12$LQv3c1yqBwWFcDDrHrjHNe7ZOQNkyM/VwcgqX6LrE/QoVF7E9DmrK', 'admin', true, true)
ON CONFLICT (phone) DO NOTHING;

-- Create staff user (password: staff123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
VALUES ('Kitchen', 'Staff', 'kitchen@fastfood.com', '+1234567891', '$2a$12$LQv3c1yqBwWFcDDrHrjHNe7ZOQNkyM/VwcgqX6LrE/QoVF7E9DmrK', 'staff', true, true)
ON CONFLICT (phone) DO NOTHING;

-- Create test customer (password: customer123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
VALUES ('John', 'Doe', 'customer@test.com', '+1234567892', '$2a$12$LQv3c1yqBwWFcDDrHrjHNe7ZOQNkyM/VwcgqX6LrE/QoVF7E9DmrK', 'customer', true, true)
ON CONFLICT (phone) DO NOTHING;

-- Create test driver (password: driver123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
VALUES ('Driver', 'Smith', 'driver@test.com', '+1234567893', '$2a$12$LQv3c1yqBwWFcDDrHrjHNe7ZOQNkyM/VwcgqX6LrE/QoVF7E9DmrK', 'driver', true, true)
ON CONFLICT (phone) DO NOTHING;

-- Create driver profile
INSERT INTO driver_profiles (user_id, license_number, vehicle_type, vehicle_number, vehicle_model, is_online)
SELECT id, 'DL123456789', 'Car', 'ABC123', 'Toyota Camry', false
FROM users WHERE phone = '+1234567893'
ON CONFLICT (user_id) DO NOTHING;

-- Create customer address
INSERT INTO customer_addresses (customer_id, label, address_line_1, city, state, postal_code, latitude, longitude, is_default)
SELECT id, 'Home', '123 Main Street', 'Anytown', 'CA', '12345', 37.7749, -122.4194, true
FROM users WHERE phone = '+1234567892'
ON CONFLICT DO NOTHING;

-- Create menu categories
INSERT INTO menu_categories (name, description, sort_order, is_active) VALUES
('Burgers', 'Delicious beef and chicken burgers', 1, true),
('Sides', 'Fries, onion rings, and more', 2, true),
('Drinks', 'Soft drinks, juices, and shakes', 3, true),
('Desserts', 'Sweet treats and ice cream', 4, true)
ON CONFLICT DO NOTHING;

-- Create menu items
-- Burgers
INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Burgers'),
    'Classic Cheeseburger',
    'Beef patty with cheese, lettuce, tomato',
    1200,
    12,
    false,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Classic Cheeseburger');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Burgers'),
    'Bacon Burger',
    'Beef patty with bacon, cheese, lettuce',
    1400,
    15,
    false,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Bacon Burger');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Burgers'),
    'Chicken Burger',
    'Grilled chicken breast with mayo, lettuce',
    1100,
    10,
    false,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Chicken Burger');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Burgers'),
    'Veggie Burger',
    'Plant-based patty with fresh vegetables',
    1300,
    10,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Veggie Burger');

-- Sides
INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Sides'),
    'French Fries',
    'Crispy golden fries',
    450,
    5,
    true,
    true,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'French Fries');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Sides'),
    'Onion Rings',
    'Crispy battered onion rings',
    550,
    7,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Onion Rings');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Sides'),
    'Mozzarella Sticks',
    'Breaded mozzarella cheese sticks',
    650,
    8,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Mozzarella Sticks');

-- Drinks
INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Drinks'),
    'Soft Drink',
    'Coke, Pepsi, Sprite',
    250,
    1,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Soft Drink');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Drinks'),
    'Milkshake',
    'Vanilla, chocolate, or strawberry',
    450,
    3,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Milkshake');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Drinks'),
    'Fresh Juice',
    'Orange, apple, or cranberry',
    350,
    2,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Fresh Juice');

-- Desserts
INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Desserts'),
    'Apple Pie',
    'Warm apple pie with cinnamon',
    400,
    2,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Apple Pie');

INSERT INTO menu_items (category_id, name, description, price_cents, prep_time_minutes, is_vegetarian, is_featured, is_active)
SELECT 
    (SELECT id FROM menu_categories WHERE name = 'Desserts'),
    'Ice Cream',
    'Vanilla, chocolate, or strawberry scoop',
    300,
    1,
    true,
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Ice Cream');

-- Add menu item modifiers for burgers
INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents, is_required, max_selections)
SELECT 
    mi.id,
    'Extra Cheese',
    100,
    false,
    1
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mc.name = 'Burgers'
AND NOT EXISTS (
    SELECT 1 FROM menu_item_modifiers mim 
    WHERE mim.menu_item_id = mi.id AND mim.name = 'Extra Cheese'
);

INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents, is_required, max_selections)
SELECT 
    mi.id,
    'Add Bacon',
    150,
    false,
    1
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mc.name = 'Burgers'
AND NOT EXISTS (
    SELECT 1 FROM menu_item_modifiers mim 
    WHERE mim.menu_item_id = mi.id AND mim.name = 'Add Bacon'
);

INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents, is_required, max_selections)
SELECT 
    mi.id,
    'No Pickles',
    0,
    false,
    1
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mc.name = 'Burgers'
AND NOT EXISTS (
    SELECT 1 FROM menu_item_modifiers mim 
    WHERE mim.menu_item_id = mi.id AND mim.name = 'No Pickles'
);

INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents, is_required, max_selections)
SELECT 
    mi.id,
    'Extra Sauce',
    50,
    false,
    1
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
WHERE mc.name = 'Burgers'
AND NOT EXISTS (
    SELECT 1 FROM menu_item_modifiers mim 
    WHERE mim.menu_item_id = mi.id AND mim.name = 'Extra Sauce'
);

-- Display seeding completion message
SELECT '✅ Database seeding completed successfully' as status;
SELECT '📝 Test accounts created:' as info;
SELECT '   Admin: phone +1234567890, password: admin123' as account_info;
SELECT '   Staff: phone +1234567891, password: staff123' as account_info;
SELECT '   Customer: phone +1234567892, password: customer123' as account_info;
SELECT '   Driver: phone +1234567893, password: driver123' as account_info;