-- =====================================================================
-- V8__seed_order_details_and_activities.sql
-- Bổ sung chi tiết đơn hàng (order_details), đánh giá (reviews),
-- và nhật ký hành vi (user_activity_logs) cho 18 đơn hàng mẫu
-- =====================================================================

-- 1. Chi tiết đơn hàng cho các đơn hàng mẫu
INSERT INTO order_details (order_id, product_id, quantity, unit_price, subtotal)
SELECT o.id, 1, 2, 450000, 900000 FROM orders o WHERE o.order_code = 'ORD1001'
UNION ALL
SELECT o.id, 3, 1, 550000, 550000 FROM orders o WHERE o.order_code = 'ORD1001'
UNION ALL
SELECT o.id, 7, 1, 650000, 650000 FROM orders o WHERE o.order_code = 'ORD1001'
UNION ALL
SELECT o.id, 8, 1, 350000, 350000 FROM orders o WHERE o.order_code = 'ORD1001'
UNION ALL
SELECT o.id, 2, 3, 280000, 840000 FROM orders o WHERE o.order_code = 'ORD1002'
UNION ALL
SELECT o.id, 6, 1, 490000, 490000 FROM orders o WHERE o.order_code = 'ORD1002'
UNION ALL
SELECT o.id, 7, 1, 560000, 560000 FROM orders o WHERE o.order_code = 'ORD1002'
UNION ALL
SELECT o.id, 4, 2, 1250000, 2500000 FROM orders o WHERE o.order_code = 'ORD1003'
UNION ALL
SELECT o.id, 5, 2, 380000, 760000 FROM orders o WHERE o.order_code = 'ORD1003'
UNION ALL
SELECT o.id, 8, 1, 240000, 240000 FROM orders o WHERE o.order_code = 'ORD1003'
UNION ALL
SELECT o.id, 4, 3, 1250000, 3750000 FROM orders o WHERE o.order_code = 'ORD1006'
UNION ALL
SELECT o.id, 7, 1, 650000, 650000 FROM orders o WHERE o.order_code = 'ORD1006'
UNION ALL
SELECT o.id, 3, 2, 550000, 1100000 FROM orders o WHERE o.order_code = 'ORD1007'
UNION ALL
SELECT o.id, 4, 2, 1250000, 2500000 FROM orders o WHERE o.order_code = 'ORD1007'
UNION ALL
SELECT o.id, 1, 1, 450000, 450000 FROM orders o WHERE o.order_code = 'ORD1009'
UNION ALL
SELECT o.id, 2, 1, 280000, 280000 FROM orders o WHERE o.order_code = 'ORD1009'
UNION ALL
SELECT o.id, 8, 1, 890000, 890000 FROM orders o WHERE o.order_code = 'ORD1010'
UNION ALL
SELECT o.id, 5, 1, 310000, 310000 FROM orders o WHERE o.order_code = 'ORD1010'
UNION ALL
SELECT o.id, 2, 1, 280000, 280000 FROM orders o WHERE o.order_code = 'ORD1012';

-- 2. Đánh giá sản phẩm mẫu
INSERT INTO reviews (customer_id, product_id, rating, comment, created_at) VALUES
(1, 1, 5, 'Áo sơ mi vải đẹp, đường may tỉ mỉ, rất đáng tiền!', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 4, 5, 'Đầm dạ hội sang trọng, vợ mình rất thích!', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(2, 4, 4, 'Chất ren cao cấp, phom dáng chuẩn.', DATE_SUB(NOW(), INTERVAL 180 DAY)),
(3, 1, 5, 'Áo mặc vừa vặn, giao hàng nhanh.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 8, 5, 'Giày đi êm chân, đúng kích cỡ.', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(6, 4, 5, 'Rất hài lòng với chất lượng đầm.', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(10, 8, 4, 'Đẹp và phong cách, sẽ ủng hộ tiếp.', DATE_SUB(NOW(), INTERVAL 15 DAY));

-- 3. Nhật ký hành vi người dùng (user_activity_logs)
INSERT INTO user_activity_logs (customer_id, action_type, product_id, category_id, search_keyword, duration_seconds, device_type, created_at) VALUES
(1, 'VIEW_PRODUCT', 1, 1, NULL, 65, 'MOBILE', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'ADD_CART', 1, 1, NULL, 15, 'MOBILE', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'PURCHASE', 1, 1, NULL, 40, 'MOBILE', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'VIEW_PRODUCT', 4, 2, NULL, 120, 'DESKTOP', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 'SEARCH', NULL, NULL, 'áo polo', 25, 'MOBILE', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(2, 'VIEW_PRODUCT', 4, 2, NULL, 90, 'DESKTOP', DATE_SUB(NOW(), INTERVAL 190 DAY)),
(2, 'SEARCH', NULL, NULL, 'váy dạ hội', 30, 'DESKTOP', DATE_SUB(NOW(), INTERVAL 191 DAY)),
(3, 'VIEW_PRODUCT', 1, 1, NULL, 45, 'MOBILE', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 'ADD_CART', 1, 1, NULL, 10, 'MOBILE', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 'PURCHASE', 1, 1, NULL, 50, 'MOBILE', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 'VIEW_PRODUCT', 8, 4, NULL, 80, 'MOBILE', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4, 'SEARCH', NULL, NULL, 'giày sneaker unisex', 20, 'MOBILE', DATE_SUB(NOW(), INTERVAL 11 DAY)),
(5, 'VIEW_PRODUCT', 2, 1, NULL, 30, 'DESKTOP', DATE_SUB(NOW(), INTERVAL 350 DAY)),
(6, 'VIEW_PRODUCT', 4, 2, NULL, 110, 'MOBILE', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6, 'ADD_CART', 4, 2, NULL, 15, 'MOBILE', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(7, 'VIEW_PRODUCT', 8, 4, NULL, 50, 'MOBILE', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(10, 'VIEW_PRODUCT', 8, 4, NULL, 75, 'DESKTOP', DATE_SUB(NOW(), INTERVAL 18 DAY));

-- 4. Tính toán lại RFM và cập nhật các chỉ số hành vi vào customer_segments
CALL sp_calculate_rfm();
