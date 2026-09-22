package com.cd1.rfmanalytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_segments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false, unique = true)
    private Customer customer;

    @Column(name = "recency_days")
    private Integer recencyDays;

    @Column(name = "frequency")
    private Integer frequency;

    @Column(name = "monetary", precision = 12, scale = 2)
    private BigDecimal monetary;

    @Column(name = "r_score")
    private Integer rScore;

    @Column(name = "f_score")
    private Integer fScore;

    @Column(name = "m_score")
    private Integer mScore;

    @Column(name = "rfm_total", precision = 4, scale = 2)
    private BigDecimal rfmTotal;

    @Column(name = "segment", length = 50)
    private String segment;

    @Column(name = "total_views")
    @Builder.Default
    private Integer totalViews = 0;

    @Column(name = "total_cart_adds")
    @Builder.Default
    private Integer totalCartAdds = 0;

    @Column(name = "total_purchases")
    @Builder.Default
    private Integer totalPurchases = 0;

    @Column(name = "total_reviews")
    @Builder.Default
    private Integer totalReviews = 0;

    @Column(name = "avg_order_value", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal avgOrderValue = BigDecimal.ZERO;

    @Column(name = "preferred_category", length = 100)
    private String preferredCategory;

    @Column(name = "last_purchase_at")
    private LocalDateTime lastPurchaseAt;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
