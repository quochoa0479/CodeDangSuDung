-- =====================================================================
-- V4__create_procedures_and_functions.sql
-- Khai thác CSDL: Stored Procedures & Functions thực thi thuật toán RFM
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
-- Thuật toán phân vị NTILE(5) chia đều nhóm khách hàng và gán phân khúc
DROP PROCEDURE IF EXISTS sp_calculate_rfm$$
CREATE PROCEDURE sp_calculate_rfm()
BEGIN
    -- Tạo bảng tạm lưu các chỉ số thô và điểm phân vị NTILE(5)
    DROP TEMPORARY TABLE IF EXISTS tmp_rfm_scores;
    
    CREATE TEMPORARY TABLE tmp_rfm_scores AS
    WITH raw_metrics AS (
        SELECT 
            c.id AS customer_id,
            COALESCE(DATEDIFF(NOW(), MAX(o.order_date)), 999) AS recency_days,
            COUNT(o.id) AS frequency,
            COALESCE(SUM(o.total_amount), 0) AS monetary,
            MAX(o.order_date) AS last_purchase_at
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id AND o.order_status = 'COMPLETED'
        GROUP BY c.id
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

    -- Cập nhật thống kê hoạt động từ bảng user_activity_logs (nếu có dữ liệu)
    UPDATE customer_segments cs
    LEFT JOIN (
        SELECT 
            customer_id,
            SUM(CASE WHEN action_type = 'VIEW_PRODUCT' THEN 1 ELSE 0 END) AS total_views,
            SUM(CASE WHEN action_type = 'ADD_CART' THEN 1 ELSE 0 END) AS total_cart_adds,
            SUM(CASE WHEN action_type = 'PURCHASE' THEN 1 ELSE 0 END) AS total_purchases,
            SUM(CASE WHEN action_type = 'REVIEW' THEN 1 ELSE 0 END) AS total_reviews,
            MAX(created_at) AS last_active_at
        FROM user_activity_logs
        GROUP BY customer_id
    ) act ON cs.customer_id = act.customer_id
    SET 
        cs.total_views = COALESCE(act.total_views, 0),
        cs.total_cart_adds = COALESCE(act.total_cart_adds, 0),
        cs.total_purchases = COALESCE(act.total_purchases, cs.frequency),
        cs.total_reviews = COALESCE(act.total_reviews, 0),
        cs.last_active_at = act.last_active_at;

    DROP TEMPORARY TABLE IF EXISTS tmp_rfm_scores;
END$$

DELIMITER ;
