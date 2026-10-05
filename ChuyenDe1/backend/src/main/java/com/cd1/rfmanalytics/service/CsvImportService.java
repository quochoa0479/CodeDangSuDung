package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.CsvPreviewDto;
import com.cd1.rfmanalytics.dto.ImportRequestDto;
import com.cd1.rfmanalytics.entity.*;
import com.cd1.rfmanalytics.repository.*;
import com.cd1.rfmanalytics.service.parser.MultiFormatFileParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvImportService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final ReviewRepository reviewRepository;
    private final ImportLogRepository importLogRepository;
    private final ImportMappingRepository mappingRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;
    private final MultiFormatFileParser fileParser;

    public record StoredFileInfo(Path path, String originalFilename, String format) {}

    private final Map<String, StoredFileInfo> tempFileStorage = new ConcurrentHashMap<>();

    private static final Map<String, List<String>> TARGET_FIELDS = Map.of(
            "customers", List.of("customer_code", "full_name", "email", "phone", "gender", "city"),
            "orders", List.of("order_code", "customer_code", "total_amount", "order_status", "payment_method", "order_date"),
            "products", List.of("name", "price", "stock_quantity", "category_name"),
            "user_activities", List.of("customer_code", "action_type", "product_id", "duration_seconds", "device_type", "created_at"),
            "user_activity_logs", List.of("customer_code", "action_type", "product_id", "duration_seconds", "device_type", "created_at"),
            "reviews", List.of("customer_code", "product_id", "rating", "comment", "created_at")
    );

    /**
     * Xem trước tệp dữ liệu đã tải lên (hỗ trợ CSV, Excel .xlsx/.xls, JSON, XML)
     */
    public CsvPreviewDto previewCsv(MultipartFile file, String targetTable) throws Exception {
        String fileId = UUID.randomUUID().toString();
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "uploaded_file.csv";

        String extension = ".tmp";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }

        Path tempPath = Files.createTempFile("import_" + fileId, extension);
        file.transferTo(tempPath.toFile());

        MultiFormatFileParser.ParsedFileData parsed = fileParser.parse(tempPath, originalFilename);
        tempFileStorage.put(fileId, new StoredFileInfo(tempPath, originalFilename, parsed.format()));

        List<Map<String, String>> sampleRows = new ArrayList<>();
        int maxSamples = Math.min(5, parsed.rows().size());
        for (int i = 0; i < maxSamples; i++) {
            sampleRows.add(parsed.rows().get(i));
        }

        List<String> targetFields = TARGET_FIELDS.getOrDefault(targetTable.toLowerCase().trim(), Collections.emptyList());

        return CsvPreviewDto.builder()
                .fileId(fileId)
                .fileName(originalFilename)
                .totalRows(parsed.totalRows())
                .headers(parsed.headers())
                .sampleRows(sampleRows)
                .targetFields(targetFields)
                .fileFormat(parsed.format())
                .build();
    }

    /**
     * Tiến hành nhập dữ liệu vào cơ sở dữ liệu dựa trên ánh xạ cột
     */
    public ImportLog processImport(ImportRequestDto request) throws Exception {
        StoredFileInfo storedInfo = tempFileStorage.get(request.getFileId());
        if (storedInfo == null || !Files.exists(storedInfo.path())) {
            throw new IllegalArgumentException("Phiên tải tệp đã hết hạn hoặc không tìm thấy. Vui lòng tải lại tệp.");
        }

        String format = storedInfo.format();
        ImportLog logEntry = ImportLog.builder()
                .importType("FULL")
                .source(format)
                .tableName(request.getTargetTable())
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .recordsImported(0)
                .recordsUpdated(0)
                .recordsFailed(0)
                .build();
        logEntry = importLogRepository.save(logEntry);

        int imported = 0;
        int updated = 0;
        int failed = 0;

        try {
            MultiFormatFileParser.ParsedFileData parsed = fileParser.parse(storedInfo.path(), storedInfo.originalFilename());
            List<Map<String, String>> rows = parsed.rows();
            Map<String, String> mapping = request.getColumnMapping() != null ? request.getColumnMapping() : Collections.emptyMap();
            String targetTable = request.getTargetTable().toLowerCase().trim();

            if ("customers".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String code = getMappedValue(row, mapping.get("customer_code"));
                        String name = getMappedValue(row, mapping.get("full_name"));
                        String email = getMappedValue(row, mapping.get("email"));
                        String phone = getMappedValue(row, mapping.get("phone"));
                        String city = getMappedValue(row, mapping.get("city"));
                        String gender = getMappedValue(row, mapping.get("gender"));

                        if (code == null || code.isBlank()) {
                            code = "CUST_" + System.currentTimeMillis() + "_" + (i + 1);
                        }
                        if (name == null || name.isBlank()) {
                            name = "Customer " + code;
                        }
                        if (email == null || email.isBlank()) {
                            email = code.toLowerCase().replaceAll("[^a-z0-9_]", "") + "@example.com";
                        }

                        Optional<Customer> existing = customerRepository.findByCustomerCode(code);
                        if (existing.isEmpty() && email != null) {
                            existing = customerRepository.findByEmail(email);
                        }

                        if (existing.isPresent()) {
                            Customer c = existing.get();
                            c.setFullName(name);
                            if (phone != null && !phone.isBlank()) c.setPhone(phone);
                            if (city != null && !city.isBlank()) c.setCity(city);
                            if (gender != null && !gender.isBlank()) c.setGender(gender);
                            customerRepository.save(c);
                            updated++;
                        } else {
                            Customer c = Customer.builder()
                                    .customerCode(code)
                                    .fullName(name)
                                    .email(email)
                                    .phone(phone)
                                    .gender(gender)
                                    .city(city)
                                    .createdAt(LocalDateTime.now())
                                    .build();
                            customerRepository.save(c);
                            imported++;
                        }
                    } catch (Exception ex) {
                        log.warn("Lỗi import dòng khách hàng {}: {}", i, ex.getMessage());
                        failed++;
                    }
                }
            } else if ("orders".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String orderCode = getMappedValue(row, mapping.get("order_code"));
                        String custCode = getMappedValue(row, mapping.get("customer_code"));
                        String amountStr = getMappedValue(row, mapping.get("total_amount"));
                        String status = getMappedValue(row, mapping.get("order_status"));
                        String paymentMethod = getMappedValue(row, mapping.get("payment_method"));
                        String dateStr = getMappedValue(row, mapping.get("order_date"));

                        Customer customer = null;
                        if (custCode != null && !custCode.isBlank()) {
                            customer = customerRepository.findByCustomerCode(custCode).orElse(null);
                        }
                        if (customer == null) {
                            customer = customerRepository.findAll().stream().findFirst().orElse(null);
                        }

                        if (customer != null) {
                            BigDecimal totalAmount = parseBigDecimal(amountStr, BigDecimal.valueOf(500000));
                            LocalDateTime orderDate = parseDateTime(dateStr);

                            Order order = Order.builder()
                                    .orderCode(orderCode != null && !orderCode.isBlank() ? orderCode : "ORD_" + System.currentTimeMillis() + "_" + (i + 1))
                                    .customer(customer)
                                    .totalAmount(totalAmount)
                                    .orderStatus(status != null && !status.isBlank() ? status.toUpperCase() : "COMPLETED")
                                    .paymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod.toUpperCase() : "COD")
                                    .orderDate(orderDate)
                                    .build();

                            orderRepository.save(order);
                            imported++;
                        } else {
                            failed++;
                        }
                    } catch (Exception ex) {
                        log.warn("Lỗi import đơn hàng {}: {}", i, ex.getMessage());
                        failed++;
                    }
                }
            } else if ("products".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String name = getMappedValue(row, mapping.get("name"));
                        String priceStr = getMappedValue(row, mapping.get("price"));
                        String stockStr = getMappedValue(row, mapping.get("stock_quantity"));
                        String catName = getMappedValue(row, mapping.get("category_name"));

                        if (name == null || name.isBlank()) {
                            name = "Sản phẩm " + (i + 1);
                        }
                        BigDecimal price = parseBigDecimal(priceStr, BigDecimal.valueOf(100000));
                        int stock = 50;
                        try {
                            if (stockStr != null) stock = Integer.parseInt(stockStr.replaceAll("[^0-9]", ""));
                        } catch (Exception ignored) {}

                        Category category = null;
                        if (catName != null && !catName.isBlank()) {
                            final String finalCatName = catName.trim();
                            category = categoryRepository.findByName(finalCatName)
                                    .orElseGet(() -> categoryRepository.save(Category.builder().name(finalCatName).description(finalCatName).build()));
                        } else {
                            category = categoryRepository.findAll().stream().findFirst().orElse(null);
                        }

                        Product product = Product.builder()
                                .name(name)
                                .price(price)
                                .stockQuantity(stock)
                                .category(category)
                                .createdAt(LocalDateTime.now())
                                .build();

                        productRepository.save(product);
                        imported++;
                    } catch (Exception ex) {
                        log.warn("Lỗi import sản phẩm {}: {}", i, ex.getMessage());
                        failed++;
                    }
                }
            } else if ("user_activities".equals(targetTable) || "user_activity_logs".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String custCode = getMappedValue(row, mapping.get("customer_code"));
                        String actionType = getMappedValue(row, mapping.get("action_type"));
                        String durationStr = getMappedValue(row, mapping.get("duration_seconds"));
                        String deviceType = getMappedValue(row, mapping.get("device_type"));
                        String dateStr = getMappedValue(row, mapping.get("created_at"));

                        Customer customer = null;
                        if (custCode != null && !custCode.isBlank()) {
                            customer = customerRepository.findByCustomerCode(custCode).orElse(null);
                        }
                        if (customer == null) {
                            customer = customerRepository.findAll().stream().findFirst().orElse(null);
                        }

                        if (customer != null) {
                            int duration = 60;
                            try {
                                if (durationStr != null) duration = Integer.parseInt(durationStr.replaceAll("[^0-9]", ""));
                            } catch (Exception ignored) {}

                            UserActivityLog act = UserActivityLog.builder()
                                    .customer(customer)
                                    .actionType(actionType != null && !actionType.isBlank() ? actionType : "VIEW_PRODUCT")
                                    .durationSeconds(duration)
                                    .deviceType(deviceType != null && !deviceType.isBlank() ? deviceType.toUpperCase() : "DESKTOP")
                                    .createdAt(parseDateTime(dateStr))
                                    .build();

                            activityLogRepository.save(act);
                            imported++;
                        } else {
                            failed++;
                        }
                    } catch (Exception ex) {
                        log.warn("Lỗi import nhật ký hoạt động {}: {}", i, ex.getMessage());
                        failed++;
                    }
                }
            }

            logEntry.setStatus("SUCCESS");
            logEntry.setRecordsImported(imported);
            logEntry.setRecordsUpdated(updated);
            logEntry.setRecordsFailed(failed);
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);

            if (request.isSaveAsTemplate() && request.getTemplateName() != null && !request.getTemplateName().isBlank()) {
                saveMapping(request.getTemplateName(), request.getTargetTable(), request.getColumnMapping());
            }

            // Tự động kích hoạt lại thuật toán RFM
            try {
                jdbcTemplate.execute("CALL sp_calculate_rfm()");
            } catch (Exception e) {
                log.warn("Auto RFM calculation after import encountered notice: {}", e.getMessage());
            }

        } catch (Exception e) {
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);
            throw e;
        } finally {
            try {
                Files.deleteIfExists(storedInfo.path());
                tempFileStorage.remove(request.getFileId());
            } catch (Exception ignored) {}
        }

        return logEntry;
    }

    public List<ImportMapping> getSavedMappings(String targetTable) {
        return mappingRepository.findByTableTarget(targetTable);
    }

    public ImportMapping saveMapping(String name, String targetTable, Map<String, String> mappingConfig) throws JsonProcessingException {
        ImportMapping mapping = ImportMapping.builder()
                .name(name)
                .tableTarget(targetTable)
                .mappingConfig(objectMapper.writeValueAsString(mappingConfig))
                .createdAt(LocalDateTime.now())
                .build();
        return mappingRepository.save(mapping);
    }

    public Page<ImportLog> getImportHistory(Pageable pageable) {
        return importLogRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    @Transactional
    public Map<String, Object> generateSampleData(int customerCount) {
        log.info("Generating sample data for {} customers...", customerCount);
        List<Product> products = productRepository.findAll();
        List<Category> categories = categoryRepository.findAll();

        String[] firstNames = {"Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"};
        String[] middleNames = {"Văn", "Thị", "Đình", "Hồng", "Minh", "Thanh", "Đức", "Ngọc", "Quang", "Xuân"};
        String[] lastNames = {"An", "Bình", "Cường", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Huy", "Khánh", "Lan", "Linh", "Long", "Mai", "Nam", "Nga", "Phong", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Thịnh", "Trang", "Trung", "Tuấn", "Tùng", "Vinh", "Yên"};
        String[] cities = {"Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Quảng Ninh", "Huế"};
        String[] genders = {"Nam", "Nữ"};
        String[] actions = {"VIEW_PRODUCT", "ADD_CART", "SEARCH", "PURCHASE", "REVIEW"};
        String[] keywords = {"áo sơ mi", "váy dạ hội", "quần jean", "áo polo", "giày sneaker", "ví da"};

        Random rand = new Random();
        int createdCustomers = 0;
        int createdOrders = 0;
        int createdActivities = 0;

        for (int i = 0; i < customerCount; i++) {
            String fullName = firstNames[rand.nextInt(firstNames.length)] + " " +
                              middleNames[rand.nextInt(middleNames.length)] + " " +
                              lastNames[rand.nextInt(lastNames.length)];
            String code = "KH" + String.format("%04d", (int) (customerRepository.count() + i + 1));
            String email = "user_" + code.toLowerCase() + "_" + (1000 + rand.nextInt(9000)) + "@gmail.com";
            String phone = "09" + String.format("%08d", rand.nextInt(100000000));
            String city = cities[rand.nextInt(cities.length)];
            String gender = genders[rand.nextInt(genders.length)];

            Customer cust = Customer.builder()
                    .customerCode(code)
                    .fullName(fullName)
                    .email(email)
                    .phone(phone)
                    .gender(gender)
                    .city(city)
                    .createdAt(LocalDateTime.now().minusDays(rand.nextInt(365)))
                    .build();
            cust = customerRepository.save(cust);
            createdCustomers++;

            // Create 1 to 8 orders for this customer
            int orderCount = rand.nextInt(8) + 1;
            for (int o = 0; o < orderCount; o++) {
                int daysAgo = rand.nextInt(300);
                LocalDateTime orderDate = LocalDateTime.now().minusDays(daysAgo);

                Order order = Order.builder()
                        .orderCode("ORD" + System.currentTimeMillis() % 1000000 + String.format("%03d", rand.nextInt(1000)))
                        .customer(cust)
                        .totalAmount(BigDecimal.ZERO)
                        .orderStatus("COMPLETED")
                        .paymentMethod(rand.nextBoolean() ? "COD" : "BANK_TRANSFER")
                        .orderDate(orderDate)
                        .build();
                order = orderRepository.save(order);
                createdOrders++;

                // Order details
                BigDecimal orderTotal = BigDecimal.ZERO;
                int items = rand.nextInt(3) + 1;
                for (int item = 0; item < items; item++) {
                    Product prod = products.isEmpty() ? null : products.get(rand.nextInt(products.size()));
                    if (prod != null) {
                        int qty = rand.nextInt(2) + 1;
                        BigDecimal sub = prod.getPrice().multiply(BigDecimal.valueOf(qty));
                        orderTotal = orderTotal.add(sub);

                        OrderDetail detail = OrderDetail.builder()
                                .order(order)
                                .product(prod)
                                .quantity(qty)
                                .unitPrice(prod.getPrice())
                                .subtotal(sub)
                                .build();
                        orderDetailRepository.save(detail);
                    }
                }
                if (orderTotal.compareTo(BigDecimal.ZERO) > 0) {
                    order.setTotalAmount(orderTotal);
                    orderRepository.save(order);
                }
            }

            // Create activities
            int actCount = rand.nextInt(10) + 3;
            for (int a = 0; a < actCount; a++) {
                Product prod = products.isEmpty() ? null : products.get(rand.nextInt(products.size()));
                Category cat = categories.isEmpty() ? null : categories.get(rand.nextInt(categories.size()));
                String action = actions[rand.nextInt(actions.length)];

                UserActivityLog act = UserActivityLog.builder()
                        .customer(cust)
                        .actionType(action)
                        .product(prod)
                        .category(cat)
                        .searchKeyword(action.equals("SEARCH") ? keywords[rand.nextInt(keywords.length)] : null)
                        .durationSeconds(rand.nextInt(180) + 10)
                        .deviceType(rand.nextBoolean() ? "MOBILE" : "DESKTOP")
                        .createdAt(LocalDateTime.now().minusDays(rand.nextInt(90)))
                        .build();
                activityLogRepository.save(act);
                createdActivities++;
            }
        }

        // Trigger RFM Calculation
        jdbcTemplate.execute("CALL sp_calculate_rfm()");

        // Record to import log
        ImportLog logEntry = ImportLog.builder()
                .importType("GENERATED")
                .source("GENERATED")
                .tableName("all")
                .status("SUCCESS")
                .recordsImported(createdCustomers + createdOrders)
                .recordsFailed(0)
                .startedAt(LocalDateTime.now())
                .completedAt(LocalDateTime.now())
                .build();
        importLogRepository.save(logEntry);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("createdCustomers", createdCustomers);
        result.put("createdOrders", createdOrders);
        result.put("createdActivities", createdActivities);
        result.put("message", "Generated realistic sample data successfully and recalculated RFM!");
        return result;
    }

    private String getMappedValue(Map<String, String> row, String mappedHeaderName) {
        if (mappedHeaderName == null || mappedHeaderName.isBlank()) {
            return null;
        }
        String val = row.get(mappedHeaderName);
        return val != null ? val.trim() : null;
    }

    private BigDecimal parseBigDecimal(String str, BigDecimal defaultValue) {
        if (str == null || str.isBlank()) {
            return defaultValue;
        }
        try {
            String clean = str.trim().replaceAll("[₫$€¥\\s]", "");
            if (clean.contains(".") && clean.contains(",")) {
                if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
                    clean = clean.replace(".", "").replace(",", ".");
                } else {
                    clean = clean.replace(",", "");
                }
            } else if (clean.contains(",") && !clean.contains(".")) {
                int commaIdx = clean.lastIndexOf(",");
                if (clean.length() - commaIdx - 1 == 3 || clean.indexOf(",") != commaIdx) {
                    clean = clean.replace(",", "");
                } else {
                    clean = clean.replace(",", ".");
                }
            } else if (clean.contains(".") && !clean.contains(",")) {
                int firstDot = clean.indexOf(".");
                int lastDot = clean.lastIndexOf(".");
                if (firstDot != lastDot) {
                    clean = clean.replace(".", "");
                } else if (clean.length() - lastDot - 1 == 3) {
                    clean = clean.replace(".", "");
                }
            }
            return new BigDecimal(clean.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return LocalDateTime.now().minusDays((long) (Math.random() * 60));
        }
        String clean = dateStr.trim();
        String[] patterns = {
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSS",
                "dd/MM/yyyy HH:mm:ss",
                "dd/MM/yyyy HH:mm",
                "yyyy-MM-dd",
                "dd/MM/yyyy",
                "dd-MM-yyyy"
        };
        for (String pattern : patterns) {
            try {
                if (pattern.contains("HH")) {
                    return LocalDateTime.parse(clean, DateTimeFormatter.ofPattern(pattern));
                } else {
                    return LocalDate.parse(clean, DateTimeFormatter.ofPattern(pattern)).atStartOfDay();
                }
            } catch (Exception ignored) {}
        }
        try {
            return LocalDateTime.parse(clean);
        } catch (Exception ignored) {}
        try {
            return LocalDate.parse(clean).atStartOfDay();
        } catch (Exception ignored) {}

        return LocalDateTime.now().minusDays((long) (Math.random() * 60));
    }
}
