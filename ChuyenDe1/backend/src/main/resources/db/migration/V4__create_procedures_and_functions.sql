-- =====================================================================
-- V4__create_procedures_and_functions.sql
-- Khai thác CSDL: Stored Procedures & Functions thực thi thuật toán RFM
-- (Sử dụng hoàn toàn cú pháp SELECT FROM WHERE, không dùng mệnh đề JOIN)
-- =====================================================================

DELIMITER $$

-- Function 1: Phân loại phân khúc kinh doanh từ bộ điểm R, F, M
DROP FUNCTION IF EXISTS fn_classify_segment$$
CREATE FUNCTION fn_classify_segment(r INT, f INT, m INT)
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
    DECLARE seg VARCHAR(50);
    
    IF (r >= 4 AND f >= 4 AND m >= 4) THEN
        SET seg = 'CHAMPIONS';
    ELSEIF (r >= 3 AND f >= 3 AND m >= 3) THEN
        SET seg = 'LOYAL_CUSTOMERS';
    ELSEIF (r >= 4 AND f >= 1 AND f <= 3) THEN
        SET seg = 'POTENTIAL_LOYALISTS';
    ELSEIF (r >= 4 AND f = 1) THEN
        SET seg = 'NEW_CUSTOMERS';
    ELSEIF (r >= 3 AND r <= 4 AND f <= 2) THEN
        SET seg = 'PROMISING';
    ELSEIF (r <= 2 AND f >= 4 AND m >= 4) THEN
        SET seg = 'CANNOT_LOSE_THEM';
    ELSEIF (r <= 2 AND f >= 3) THEN
        SET seg = 'AT_RISK';
    ELSEIF (r <= 2 AND f <= 2 AND m >= 3) THEN
        SET seg = 'ABOUT_TO_SLEEP';
    ELSEIF (r <= 2 AND f <= 2 AND m <= 2) THEN
        SET seg = 'HIBERNATING';
    ELSE
        SET seg = 'LOST';
    END IF;
    
    RETURN seg;
END$$

-- Function 2: Tính điểm RFM tổng hợp (trọng số R: 30%, F: 30%, M: 40%)
DROP FUNCTION IF EXISTS fn_calculate_rfm_score$$
CREATE FUNCTION fn_calculate_rfm_score(r INT, f INT, m INT)
RETURNS DECIMAL(4, 2)
DETERMINISTIC
BEGIN
    RETURN ROUND((r * 0.30) + (f * 0.30) + (m * 0.40), 2);
END$$

-- Stored Procedure: sp_calculate_rfm
-- Thuật toán phân vị NTILE(5) phân loại khách hàng, dùng thuần cú pháp SELECT FROM WHERE
DROP PROCEDURE IF EXISTS sp_calculate_rfm$$
CREATE PROCEDURE sp_calculate_rfm()
BEGIN
    -- Tạo bảng tạm lưu các chỉ số thô và điểm phân vị NTILE(5)
    DROP TEMPORARY TABLE IF EXISTS tmp_rfm_scores;
    
    CREATE TEMPORARY TABLE tmp_rfm_scores AS
    WITH raw_metrics AS (
        SELECT 
            c.id AS customer_id,
            COALESCE((
                SELECT DATEDIFF(NOW(), MAX(o.order_date)) 
                FROM orders o 
                WHERE o.customer_id = c.id AND o.order_status = 'COMPLETED'
            ), 999) AS recency_days,
            COALESCE((
                SELECT COUNT(o.id) 
                FROM orders o 
                WHERE o.customer_id = c.id AND o.order_status = 'COMPLETED'
            ), 0) AS frequency,
            COALESCE((
                SELECT SUM(o.total_amount) 
                FROM orders o 
                WHERE o.customer_id = c.id AND o.order_status = 'COMPLETED'
            ), 0) AS monetary,
            (
                SELECT MAX(o.order_date) 
                FROM orders o 
                WHERE o.customer_id = c.id AND o.order_status = 'COMPLETED'
            ) AS last_purchase_at
        FROM customers c
    ),
    quantiles AS (
        SELECT 
            customer_id,
            recency_days,
            frequency,
            monetary,
            last_purchase_at,
            -- Recency: Số ngày càng nhỏ thì điểm càng cao (NTILE 5 DESC của recency)
            6 - NTILE(5) OVER (ORDER BY recency_days ASC) AS r_score,
            -- Frequency: Số đơn càng nhiều thì điểm càng cao
            NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
            -- Monetary: Tổng chi tiêu càng nhiều thì điểm càng cao
            NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
        FROM raw_metrics
    )
    SELECT 
        customer_id,
        recency_days,
        frequency,
        monetary,
        r_score,
        f_score,
        m_score,
        fn_calculate_rfm_score(r_score, f_score, m_score) AS rfm_total,
        fn_classify_segment(r_score, f_score, m_score) AS segment,
        last_purchase_at
    FROM quantiles;

    -- Cập nhật hoặc thêm mới vào bảng customer_segments
    INSERT INTO customer_segments (
        customer_id, recency_days, frequency, monetary,
        r_score, f_score, m_score, rfm_total, segment,
        last_purchase_at, avg_order_value, calculated_at
    )
    SELECT 
        t.customer_id, t.recency_days, t.frequency, t.monetary,
        t.r_score, t.f_score, t.m_score, t.rfm_total, t.segment,
        t.last_purchase_at,
        CASE WHEN t.frequency > 0 THEN ROUND(t.monetary / t.frequency, 2) ELSE 0 END,
        NOW()
    FROM tmp_rfm_scores t
    ON DUPLICATE KEY UPDATE 
        recency_days = VALUES(recency_days),
        frequency = VALUES(frequency),
        monetary = VALUES(monetary),
        r_score = VALUES(r_score),
        f_score = VALUES(f_score),
        m_score = VALUES(m_score),
        rfm_total = VALUES(rfm_total),
        segment = VALUES(segment),
        last_purchase_at = VALUES(last_purchase_at),
        avg_order_value = VALUES(avg_order_value),
        calculated_at = NOW();

    -- Cập nhật thống kê hoạt động từ bảng user_activity_logs (dùng SELECT FROM WHERE)
    UPDATE customer_segments cs
    SET 
        cs.total_views = COALESCE((
            SELECT COUNT(*) 
            FROM user_activity_logs 
            WHERE customer_id = cs.customer_id AND action_type = 'VIEW_PRODUCT'
        ), 0),
        cs.total_cart_adds = COALESCE((
            SELECT COUNT(*) 
            FROM user_activity_logs 
            WHERE customer_id = cs.customer_id AND action_type = 'ADD_CART'
        ), 0),
        cs.total_purchases = COALESCE((
            SELECT COUNT(*) 
            FROM user_activity_logs 
            WHERE customer_id = cs.customer_id AND action_type = 'PURCHASE'
        ), cs.frequency),
        cs.total_reviews = COALESCE((
            SELECT COUNT(*) 
            FROM user_activity_logs 
            WHERE customer_id = cs.customer_id AND action_type = 'REVIEW'
        ), 0),
        cs.last_active_at = (
            SELECT MAX(created_at) 
            FROM user_activity_logs 
            WHERE customer_id = cs.customer_id
        );

    DROP TEMPORARY TABLE IF EXISTS tmp_rfm_scores;
END$$

DELIMITER ;
