-- V10: Sửa thuật toán tính toán RFM, xử lý đúng khách hàng chưa có đơn và cập nhật View cảnh báo rủi ro rời bỏ

-- 1. Cập nhật View v_churn_risk_customers: Chỉ cảnh báo khách hàng THỰC SỰ đã từng mua hàng (frequency > 0, monetary > 0)
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
FROM customer_segments cs, customers c
WHERE cs.customer_id = c.id
  AND cs.frequency > 0
  AND cs.monetary > 0
  AND cs.recency_days > 0
  AND cs.recency_days < 999
  AND (cs.segment IN ('AT_RISK', 'ABOUT_TO_SLEEP', 'CANNOT_LOSE_THEM')
       OR (cs.r_score <= 2 AND cs.monetary > 5000000));

-- 2. Cập nhật Stored Procedure sp_calculate_rfm
DROP PROCEDURE IF EXISTS sp_calculate_rfm;
DELIMITER $$
CREATE PROCEDURE sp_calculate_rfm()
BEGIN
    DROP TEMPORARY TABLE IF EXISTS tmp_rfm_scores;
    
    CREATE TEMPORARY TABLE tmp_rfm_scores AS
    WITH raw_metrics AS (
        SELECT 
            c.id AS customer_id,
            (
                SELECT DATEDIFF(NOW(), MAX(o.order_date)) 
                FROM orders o 
                WHERE o.customer_id = c.id AND UPPER(TRIM(o.order_status)) = 'COMPLETED'
            ) AS raw_recency_days,
            COALESCE((
                SELECT COUNT(o.id) 
                FROM orders o 
                WHERE o.customer_id = c.id AND UPPER(TRIM(o.order_status)) = 'COMPLETED'
            ), 0) AS frequency,
            COALESCE((
                SELECT SUM(o.total_amount) 
                FROM orders o 
                WHERE o.customer_id = c.id AND UPPER(TRIM(o.order_status)) = 'COMPLETED'
            ), 0) AS monetary,
            (
                SELECT MAX(o.order_date) 
                FROM orders o 
                WHERE o.customer_id = c.id AND UPPER(TRIM(o.order_status)) = 'COMPLETED'
            ) AS last_purchase_at
        FROM customers c
    ),
    active_customers AS (
        SELECT 
            customer_id,
            COALESCE(raw_recency_days, 0) AS recency_days,
            frequency,
            monetary,
            last_purchase_at,
            CASE 
                WHEN (SELECT COUNT(*) FROM raw_metrics WHERE frequency > 0) < 5 THEN
                    CASE 
                        WHEN raw_recency_days <= 30 THEN 5
                        WHEN raw_recency_days <= 60 THEN 4
                        WHEN raw_recency_days <= 90 THEN 3
                        WHEN raw_recency_days <= 180 THEN 2
                        ELSE 1 
                    END
                ELSE
                    6 - NTILE(5) OVER (ORDER BY raw_recency_days ASC)
            END AS r_score,
            CASE 
                WHEN (SELECT COUNT(*) FROM raw_metrics WHERE frequency > 0) < 5 THEN
                    CASE 
                        WHEN frequency >= 5 THEN 5
                        WHEN frequency >= 3 THEN 4
                        WHEN frequency >= 2 THEN 3
                        WHEN frequency = 1 THEN 2
                        ELSE 1 
                    END
                ELSE
                    NTILE(5) OVER (ORDER BY frequency ASC)
            END AS f_score,
            CASE 
                WHEN (SELECT COUNT(*) FROM raw_metrics WHERE frequency > 0) < 5 THEN
                    CASE 
                        WHEN monetary >= 20000000 THEN 5
                        WHEN monetary >= 10000000 THEN 4
                        WHEN monetary >= 5000000 THEN 3
                        WHEN monetary >= 1000000 THEN 2
                        ELSE 1 
                    END
                ELSE
                    NTILE(5) OVER (ORDER BY monetary ASC)
            END AS m_score
        FROM raw_metrics
        WHERE frequency > 0
    ),
    inactive_customers AS (
        SELECT 
            customer_id,
            0 AS recency_days,
            0 AS frequency,
            0.00 AS monetary,
            last_purchase_at,
            1 AS r_score,
            1 AS f_score,
            1 AS m_score
        FROM raw_metrics
        WHERE frequency = 0
    ),
    all_scored AS (
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
        FROM active_customers
        UNION ALL
        SELECT 
            customer_id,
            recency_days,
            frequency,
            monetary,
            r_score,
            f_score,
            m_score,
            1.00 AS rfm_total,
            'NEW_CUSTOMERS' AS segment,
            last_purchase_at
        FROM inactive_customers
    )
    SELECT * FROM all_scored;

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

    -- Cập nhật thống kê hoạt động từ bảng user_activity_logs
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

-- 3. Xóa các bản ghi khách hàng rác đã sinh tự động khi import nhầm
DELETE FROM customer_segments WHERE customer_id IN (SELECT id FROM customers WHERE customer_code LIKE 'CUST_1791%');
DELETE FROM customers WHERE customer_code LIKE 'CUST_1791%';
