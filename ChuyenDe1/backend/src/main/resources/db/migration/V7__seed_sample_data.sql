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

-- 3. Sản phẩm cơ sở
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
