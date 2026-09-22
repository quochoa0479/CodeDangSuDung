-- =====================================================================
-- V7__seed_sample_data.sql
-- Nạp dữ liệu mẫu ban đầu (Tài khoản Admin, Danh mục, Khách hàng, Đơn hàng)
-- =====================================================================

-- 1. Quyền và Tài khoản quản trị nội bộ
INSERT INTO sys_roles (id, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên toàn quyền hệ thống'),
(2, 'ANALYST', 'Chuyên viên phân tích dữ liệu')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO sys_users (id, username, password, full_name, email, role_id, is_active) VALUES
(1, 'admin', 'admin123', 'Quản Trị Viên', 'admin@rfmanalytics.vn', 1, TRUE),
(2, 'analyst', 'analyst123', 'Chuyên Viên Phân Tích', 'analyst@rfmanalytics.vn', 2, TRUE)
ON DUPLICATE KEY UPDATE username=VALUES(username);

-- 2. Danh mục sản phẩm
INSERT INTO categories (id, name, description) VALUES
(1, 'Thời trang Nam', 'Áo sơ mi, áo thun, quần jeans, vest'),
(2, 'Thời trang Nữ', 'Váy, đầm, áo kiểu, chân váy'),
(3, 'Phụ kiện', 'Túi xách, thắt lưng, ví da, đồng hồ'),
(4, 'Giày dép', 'Giày thể thao, giày da, sandal')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Sản phẩm mẫu
INSERT INTO products (id, category_id, name, price, stock_quantity) VALUES
(1, 1, 'Áo sơ mi Oxford Nam', 450000, 100),
(2, 1, 'Áo thun Polo Cotton Compact', 280000, 150),
(3, 1, 'Quần Jeans Slimfit Co Giãn', 550000, 80),
(4, 2, 'Đầm Dạ Hội Ren Cao Cấp', 1250000, 40),
(5, 2, 'Áo Kiểu Voan Hoa Nữ', 380000, 90),
(6, 3, 'Thắt Lưng Da Bò Khóa Tự Động', 490000, 60),
(7, 3, 'Ví Da Nam Cầm Tay', 650000, 50),
(8, 4, 'Giày Sneaker Trắng Unisex', 890000, 70)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. Khách hàng mẫu đại diện các nhóm hành vi
INSERT INTO customers (id, customer_code, full_name, email, phone, gender, city) VALUES
(1, 'KH001', 'Nguyễn Văn Nam', 'nam.nguyen@gmail.com', '0901234567', 'Nam', 'Hà Nội'),
(2, 'KH002', 'Trần Thị Lan', 'lan.tran@yahoo.com', '0912345678', 'Nữ', 'TP. Hồ Chí Minh'),
(3, 'KH003', 'Lê Hoàng Hùng', 'hung.le@outlook.com', '0987654321', 'Nam', 'Đà Nẵng'),
(4, 'KH004', 'Phạm Tuyết Mai', 'mai.pham@gmail.com', '0933445566', 'Nữ', 'Hải Phòng'),
(5, 'KH005', 'Vũ Đình Ba', 'ba.vu@gmail.com', '0977889900', 'Nam', 'Cần Thơ'),
(6, 'KH006', 'Đỗ Quỳnh Anh', 'anh.do@gmail.com', '0944556677', 'Nữ', 'Hà Nội'),
(7, 'KH007', 'Hoàng Minh Quân', 'quan.hoang@gmail.com', '0966778899', 'Nam', 'TP. Hồ Chí Minh'),
(8, 'KH008', 'Ngô Thu Thảo', 'thao.ngo@gmail.com', '0922334455', 'Nữ', 'Bình Dương'),
(9, 'KH009', 'Đặng Quốc Huy', 'huy.dang@gmail.com', '0911223344', 'Nam', 'Đồng Nai'),
(10, 'KH010', 'Bùi Kim Ngân', 'ngan.bui@gmail.com', '0955667788', 'Nữ', 'Khánh Hòa')
ON DUPLICATE KEY UPDATE customer_code=VALUES(customer_code);

-- 5. Lịch sử đơn hàng để mô phỏng phân khúc RFM thực tế:
-- KH001 (Nam): Mua nhiều, mua mới, chi đậm -> Sẽ thành CHAMPIONS
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1001', 1, 2450000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ORD1002', 1, 1890000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 15 DAY)),
('ORD1003', 1, 3500000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 45 DAY)),
('ORD1004', 1, 2200000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 70 DAY)),
('ORD1005', 1, 1500000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 90 DAY));

-- KH002 (Lan): Từng chi tiêu rất lớn nhưng đã lâu không mua -> Sẽ thành AT_RISK
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1006', 2, 4500000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 190 DAY)),
('ORD1007', 2, 3800000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 230 DAY)),
('ORD1008', 2, 5200000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 280 DAY));

-- KH003 (Hùng): Mới mua 1 đơn gần đây -> Sẽ thành NEW_CUSTOMERS
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1009', 3, 730000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- KH004 (Mai): Mua vài lần gần đây -> Sẽ thành POTENTIAL_LOYALISTS
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1010', 4, 1200000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 10 DAY)),
('ORD1011', 4, 1650000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 35 DAY));

-- KH005 (Ba): Mua 1 lần từ năm ngoái, giá trị thấp -> HIBERNATING / LOST
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1012', 5, 280000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 350 DAY));

-- Thêm các đơn hàng khác cho các khách còn lại
INSERT INTO orders (order_code, customer_id, total_amount, order_status, order_date) VALUES
('ORD1013', 6, 3100000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 20 DAY)),
('ORD1014', 6, 2400000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 50 DAY)),
('ORD1015', 7, 850000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('ORD1016', 8, 1950000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 40 DAY)),
('ORD1017', 9, 450000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 320 DAY)),
('ORD1018', 10, 2750000, 'COMPLETED', DATE_SUB(NOW(), INTERVAL 18 DAY));

-- 6. Tự động chạy thuật toán RFM ngay sau khi nạp seed data
CALL sp_calculate_rfm();
