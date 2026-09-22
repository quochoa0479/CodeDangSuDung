-- =====================================================================
-- V3__create_views.sql
-- Khai thác CSDL: 5 Views phục vụ báo cáo và phân tích thông minh
-- =====================================================================

-- View 1: v_rfm_summary - Thống kê tổng quan các phân khúc khách hàng
CREATE OR REPLACE VIEW v_rfm_summary AS
SELECT 
    cs.segment,
    COUNT(cs.id) AS total_customers,
    ROUND(COUNT(cs.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM customer_segments), 0), 2) AS percentage,
    ROUND(AVG(cs.recency_days), 1) AS avg_recency_days,
    ROUND(AVG(cs.frequency), 1) AS avg_orders,
    ROUND(AVG(cs.monetary), 0) AS avg_monetary,
    ROUND(SUM(cs.monetary), 0) AS total_revenue,
    ROUND(AVG(cs.rfm_total), 2) AS avg_rfm_score
FROM customer_segments cs
GROUP BY cs.segment;

-- View 2: v_customer_360 - Chân dung toàn diện khách hàng (Thông tin + RFM + Hành vi)
CREATE OR REPLACE VIEW v_customer_360 AS
SELECT 
    c.id AS customer_id,
    c.customer_code,
    c.full_name,
    c.email,
    c.phone,
    c.city,
    cs.segment,
    cs.r_score,
    cs.f_score,
    cs.m_score,
    cs.rfm_total,
    cs.recency_days,
    cs.frequency,
    cs.monetary,
    cs.avg_order_value,
    cs.total_views,
    cs.total_cart_adds,
    cs.total_purchases,
    cs.preferred_category,
    cs.last_purchase_at
FROM customers c
LEFT JOIN customer_segments cs ON c.id = cs.customer_id;

-- View 3: v_churn_risk_customers - Cảnh báo khách hàng nguy cơ rời bỏ
CREATE OR REPLACE VIEW v_churn_risk_customers AS
SELECT 
    c.id AS customer_id,
    c.customer_code,
    c.full_name,
    c.email,
    c.phone,
    cs.segment,
    cs.recency_days,
    cs.frequency,
    cs.monetary,
    cs.last_purchase_at
FROM customer_segments cs
JOIN customers c ON cs.customer_id = c.id
WHERE cs.segment IN ('AT_RISK', 'ABOUT_TO_SLEEP', 'CANNOT_LOSE_THEM')
   OR (cs.r_score <= 2 AND cs.monetary > 5000000);

-- View 4: v_category_preference - Danh mục yêu thích và doanh thu theo phân khúc
CREATE OR REPLACE VIEW v_category_preference AS
SELECT 
    cs.segment,
    cat.name AS category_name,
    COUNT(od.id) AS total_items_sold,
    SUM(od.subtotal) AS category_revenue
FROM customer_segments cs
JOIN orders o ON cs.customer_id = o.customer_id
JOIN order_details od ON o.id = od.order_id
JOIN products p ON od.product_id = p.id
JOIN categories cat ON p.category_id = cat.id
WHERE o.order_status = 'COMPLETED'
GROUP BY cs.segment, cat.name;

-- View 5: v_monthly_revenue_cohort - Doanh thu theo tháng
CREATE OR REPLACE VIEW v_monthly_revenue_cohort AS
SELECT 
    DATE_FORMAT(order_date, '%Y-%m') AS order_month,
    COUNT(DISTINCT customer_id) AS active_customers,
    COUNT(id) AS total_orders,
    SUM(total_amount) AS monthly_revenue,
    ROUND(AVG(total_amount), 0) AS avg_order_value
FROM orders
WHERE order_status = 'COMPLETED'
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY order_month DESC;
