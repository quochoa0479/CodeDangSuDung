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
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
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
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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
            "all", List.of("order_code", "customer_code", "full_name", "email", "phone", "gender", "city", "order_date", "total_amount", "order_status", "payment_method", "product_name", "product_price", "category_name", "quantity"),
            "orders", List.of("order_code", "customer_code", "full_name", "email", "phone", "gender", "city", "order_date", "total_amount", "order_status", "payment_method", "product_name", "product_price", "category_name"),
            "customers", List.of("customer_code", "full_name", "email", "phone", "gender", "city"),
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

        // 1. Lưu trữ vĩnh viễn tệp vào thư mục storage/uploads trên máy chủ
        Path uploadDirPath = Paths.get("storage", "uploads");
        if (!Files.exists(uploadDirPath)) {
            Files.createDirectories(uploadDirPath);
        }
        String safeFileName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + storedInfo.originalFilename();
        Path permanentPath = uploadDirPath.resolve(safeFileName);
        Files.copy(storedInfo.path(), permanentPath, StandardCopyOption.REPLACE_EXISTING);
        long fileSize = Files.size(permanentPath);

        ImportLog logEntry = ImportLog.builder()
                .importType("FULL")
                .source(format)
                .tableName(request.getTargetTable())
                .fileName(storedInfo.originalFilename())
                .storedFilePath(permanentPath.toString())
                .fileSize(fileSize)
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .recordsImported(0)
                .recordsUpdated(0)
                .recordsFailed(0)
                .build();
        logEntry = importLogRepository.save(logEntry);

        try {
            MultiFormatFileParser.ParsedFileData parsed = fileParser.parse(storedInfo.path(), storedInfo.originalFilename());
            executeRows(logEntry, parsed.rows(), request.getTargetTable(), request.getColumnMapping(), request.isCleanBeforeImport());

            if (request.isSaveAsTemplate() && request.getTemplateName() != null && !request.getTemplateName().isBlank()) {
                saveMapping(request.getTemplateName(), request.getTargetTable(), request.getColumnMapping());
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

    /**
     * Thực thi nạp các dòng dữ liệu vào bảng đích và kích hoạt tính toán RFM
     */
    private void executeRows(
            ImportLog logEntry,
            List<Map<String, String>> rows,
            String targetTableInput,
            Map<String, String> mappingInput,
            boolean cleanBeforeImport) throws Exception {

        int imported = 0;
        int updated = 0;
        int failed = 0;

        Map<String, String> mapping = mappingInput != null ? mappingInput : Collections.emptyMap();
        String targetTable = targetTableInput.toLowerCase().trim();

        if (cleanBeforeImport) {
            try {
                jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
                jdbcTemplate.execute("TRUNCATE TABLE order_details");
                jdbcTemplate.execute("TRUNCATE TABLE reviews");
                jdbcTemplate.execute("TRUNCATE TABLE user_activity_logs");
                jdbcTemplate.execute("TRUNCATE TABLE customer_segments");
                jdbcTemplate.execute("TRUNCATE TABLE segment_history");
                jdbcTemplate.execute("TRUNCATE TABLE orders");
                jdbcTemplate.execute("TRUNCATE TABLE customers");
                jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
                log.info("Đã làm sạch toàn bộ dữ liệu bán hàng cũ theo tùy chọn cleanBeforeImport.");
            } catch (Exception ex) {
                log.warn("Lỗi khi làm sạch dữ liệu cũ: {}", ex.getMessage());
            }
        }

            if ("customers".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String code = getValue(row, mapping, "customer_code", "customer_id", "cust_id", "cust_code", "customerid", "id");
                        String name = getValue(row, mapping, "full_name", "customer_name", "name", "customername");
                        String email = getValue(row, mapping, "email", "mail", "e-mail");
                        String phone = getValue(row, mapping, "phone", "phone_number", "sdt", "mobile");
                        String city = getValue(row, mapping, "city", "province", "address");
                        String gender = getValue(row, mapping, "gender", "sex");

                        if (code == null || code.isBlank()) {
                            code = "CUST_" + System.currentTimeMillis() + "_" + (i + 1);
                        }
                        if (name == null || name.isBlank()) {
                            name = "Khách hàng " + code;
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
            } else if ("orders".equals(targetTable) || "all".equals(targetTable) || "all_in_one".equals(targetTable)) {
                for (int i = 0; i < rows.size(); i++) {
                    Map<String, String> row = rows.get(i);
                    try {
                        String orderCode = getValue(row, mapping, "order_code", "order_id", "orderid", "id", "code");
                        String custCode = getValue(row, mapping, "customer_code", "customer_id", "cust_id", "cust_code", "customerid");
                        String custName = getValue(row, mapping, "full_name", "customer_name", "name", "customername");
                        String custEmail = getValue(row, mapping, "email", "mail", "e-mail");
                        String custPhone = getValue(row, mapping, "phone", "phone_number", "sdt", "mobile", "telephone");
                        String custCity = getValue(row, mapping, "city", "province", "address", "thanhpho", "tinhthanh");
                        String custGender = getValue(row, mapping, "gender", "sex", "gioitinh");
                        String amountStr = getValue(row, mapping, "total_amount", "order_amount", "amount", "total", "price");
                        String status = getValue(row, mapping, "order_status", "status", "orderstatus");
                        String paymentMethod = getValue(row, mapping, "payment_method", "payment", "method");
                        String dateStr = getValue(row, mapping, "order_date", "orderdate", "date", "created_at");

                        // Thông tin sản phẩm (nếu file có cột sản phẩm)
                        String prodName = getValue(row, mapping, "product_name", "product", "item_name", "sanpham", "tensanpham", "name");
                        String prodPriceStr = getValue(row, mapping, "product_price", "unit_price", "price", "gia", "dongia");
                        String prodCategory = getValue(row, mapping, "category_name", "category", "danhmuc", "loaisanpham");
                        String prodQuantityStr = getValue(row, mapping, "quantity", "qty", "soluong", "so_luong");

                        // 1. Xử lý Khách hàng
                        Customer customer = null;
                        if (custCode != null && !custCode.isBlank()) {
                            customer = customerRepository.findByCustomerCode(custCode).orElse(null);
                        }
                        if (customer == null && custEmail != null && !custEmail.isBlank()) {
                            customer = customerRepository.findByEmail(custEmail).orElse(null);
                        }

                        if (customer == null && ((custCode != null && !custCode.isBlank()) || (custEmail != null && !custEmail.isBlank()) || (custName != null && !custName.isBlank()))) {
                            String code = (custCode != null && !custCode.isBlank()) ? custCode : "CUST_" + System.currentTimeMillis() + "_" + (i + 1);
                            String name = (custName != null && !custName.isBlank()) ? custName : "Khách hàng " + code;
                            String email = (custEmail != null && !custEmail.isBlank()) ? custEmail : (code.toLowerCase().replaceAll("[^a-z0-9_]", "") + "@example.com");
                            customer = Customer.builder()
                                    .customerCode(code)
                                    .fullName(name)
                                    .email(email)
                                    .phone(custPhone)
                                    .city(custCity)
                                    .gender(custGender)
                                    .createdAt(LocalDateTime.now())
                                    .build();
                            customer = customerRepository.save(customer);
                        } else if (customer != null) {
                            boolean changed = false;
                            if (custName != null && !custName.isBlank() && 
                                    (customer.getFullName() == null || customer.getFullName().startsWith("Customer CUST_") || customer.getFullName().startsWith("Khách hàng CUST_") || !customer.getFullName().equals(custName))) {
                                customer.setFullName(custName);
                                changed = true;
                            }
                            if (custEmail != null && !custEmail.isBlank() && !custEmail.equals(customer.getEmail())) {
                                customer.setEmail(custEmail);
                                changed = true;
                            }
                            if (custPhone != null && !custPhone.isBlank() && !custPhone.equals(customer.getPhone())) {
                                customer.setPhone(custPhone);
                                changed = true;
                            }
                            if (custCity != null && !custCity.isBlank() && !custCity.equals(customer.getCity())) {
                                customer.setCity(custCity);
                                changed = true;
                            }
                            if (custGender != null && !custGender.isBlank() && !custGender.equals(customer.getGender())) {
                                customer.setGender(custGender);
                                changed = true;
                            }
                            if (changed) {
                                customer = customerRepository.save(customer);
                            }
                        }

                        if (customer == null) {
                            customer = customerRepository.findAll().stream().findFirst().orElse(null);
                        }

                        // 2. Xử lý Sản phẩm (nếu có)
                        Product product = null;
                        if (prodName != null && !prodName.isBlank()) {
                            final String finalProdName = prodName.trim();
                            product = productRepository.findByName(finalProdName).orElse(null);
                            if (product == null) {
                                Category category = null;
                                if (prodCategory != null && !prodCategory.isBlank()) {
                                    final String finalCatName = prodCategory.trim();
                                    category = categoryRepository.findByName(finalCatName)
                                            .orElseGet(() -> categoryRepository.save(Category.builder().name(finalCatName).description(finalCatName).build()));
                                } else {
                                    category = categoryRepository.findAll().stream().findFirst().orElse(null);
                                }
                                BigDecimal prodPrice = parseBigDecimal(prodPriceStr, BigDecimal.valueOf(100000));
                                product = Product.builder()
                                        .name(finalProdName)
                                        .price(prodPrice)
                                        .stockQuantity(100)
                                        .category(category)
                                        .createdAt(LocalDateTime.now())
                                        .build();
                                product = productRepository.save(product);
                            }
                        }

                        // 3. Xử lý Đơn hàng
                        boolean hasOrderInfo = (orderCode != null && !orderCode.isBlank()) || (amountStr != null && !amountStr.isBlank());
                        if (hasOrderInfo && customer != null) {
                            BigDecimal totalAmount = parseBigDecimal(amountStr, BigDecimal.valueOf(500000));
                            LocalDateTime orderDate = parseDateTime(dateStr);
                            String finalOrderCode = (orderCode != null && !orderCode.isBlank()) ? orderCode : "ORD_" + System.currentTimeMillis() + "_" + (i + 1);

                            Optional<Order> existing = orderRepository.findByOrderCode(finalOrderCode);
                            Order ord;
                            if (existing.isPresent()) {
                                ord = existing.get();
                                ord.setCustomer(customer);
                                ord.setTotalAmount(totalAmount);
                                ord.setOrderStatus(status != null && !status.isBlank() ? status.toUpperCase().trim() : "COMPLETED");
                                ord.setPaymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod.toUpperCase().trim() : "COD");
                                ord.setOrderDate(orderDate);
                                ord = orderRepository.save(ord);
                                updated++;
                            } else {
                                ord = Order.builder()
                                        .orderCode(finalOrderCode)
                                        .customer(customer)
                                        .totalAmount(totalAmount)
                                        .orderStatus(status != null && !status.isBlank() ? status.toUpperCase().trim() : "COMPLETED")
                                        .paymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod.toUpperCase().trim() : "COD")
                                        .orderDate(orderDate)
                                        .build();
                                ord = orderRepository.save(ord);
                                imported++;
                            }

                            // 4. Nếu có sản phẩm đi kèm đơn, lưu OrderDetail
                            if (product != null) {
                                int qty = 1;
                                if (prodQuantityStr != null && !prodQuantityStr.isBlank()) {
                                    try {
                                        qty = Math.max(1, Integer.parseInt(prodQuantityStr.replaceAll("[^0-9]", "")));
                                    } catch (Exception ignored) {}
                                }
                                BigDecimal unitPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.valueOf(100000);
                                OrderDetail od = OrderDetail.builder()
                                        .order(ord)
                                        .product(product)
                                        .quantity(qty)
                                        .unitPrice(unitPrice)
                                        .subtotal(unitPrice.multiply(BigDecimal.valueOf(qty)))
                                        .build();
                                orderDetailRepository.save(od);
                            }
                        } else if (customer != null) {
                            imported++;
                        } else if (product != null) {
                            imported++;
                        } else {
                            failed++;
                        }
                    } catch (Exception ex) {
                        log.warn("Lỗi import dòng {}: {}", i, ex.getMessage());
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

        // Tự động kích hoạt lại thuật toán RFM
        try {
            jdbcTemplate.execute("CALL sp_calculate_rfm()");
        } catch (Exception e) {
            log.warn("Auto RFM calculation after import encountered notice: {}", e.getMessage());
        }
    }

    /**
     * Tải tệp dữ liệu đã nạp trước đó từ máy chủ
     */
    public Resource downloadImportFile(Long logId) throws Exception {
        ImportLog logEntry = importLogRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhật ký import #" + logId));
        if (logEntry.getStoredFilePath() == null || logEntry.getStoredFilePath().isBlank()) {
            throw new IllegalArgumentException("Lô import này không có tệp lưu trữ trên máy chủ");
        }
        Path filePath = Paths.get(logEntry.getStoredFilePath());
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("Tệp vật lý không còn tồn tại trên máy chủ: " + filePath);
        }
        return new UrlResource(filePath.toUri());
    }

    /**
     * Lấy tên tệp gốc của bản ghi import
     */
    public String getImportFileName(Long logId) {
        ImportLog logEntry = importLogRepository.findById(logId).orElse(null);
        if (logEntry != null && logEntry.getFileName() != null && !logEntry.getFileName().isBlank()) {
            return logEntry.getFileName();
        }
        return "imported_file.xlsx";
    }

    /**
     * Phân tích lại một tệp đã lưu trước đó trên server (Rerun)
     */
    public ImportLog rerunImport(Long logId, boolean cleanBeforeImport) throws Exception {
        ImportLog oldLog = importLogRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhật ký import #" + logId));
        if (oldLog.getStoredFilePath() == null || oldLog.getStoredFilePath().isBlank()) {
            throw new IllegalArgumentException("Lô import này không có tệp lưu trữ trên máy chủ");
        }
        Path filePath = Paths.get(oldLog.getStoredFilePath());
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("Tệp vật lý không còn tồn tại trên máy chủ: " + filePath);
        }

        MultiFormatFileParser.ParsedFileData parsed = fileParser.parse(filePath, oldLog.getFileName());

        ImportLog newLog = ImportLog.builder()
                .importType("RERUN")
                .source(oldLog.getSource())
                .tableName(oldLog.getTableName())
                .fileName(oldLog.getFileName())
                .storedFilePath(oldLog.getStoredFilePath())
                .fileSize(oldLog.getFileSize())
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .recordsImported(0)
                .recordsUpdated(0)
                .recordsFailed(0)
                .build();
        newLog = importLogRepository.save(newLog);

        try {
            executeRows(newLog, parsed.rows(), oldLog.getTableName(), Collections.emptyMap(), cleanBeforeImport);
        } catch (Exception e) {
            newLog.setStatus("FAILED");
            newLog.setErrorMessage(e.getMessage());
            newLog.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(newLog);
            throw e;
        }

        return newLog;
    }

    public List<ImportMapping> getSavedMappings(String targetTable) {
        if (targetTable == null || targetTable.isBlank() || "all".equalsIgnoreCase(targetTable) || "all_in_one".equalsIgnoreCase(targetTable)) {
            return mappingRepository.findAll();
        }
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
    public void deleteImportLog(Long logId) {
        ImportLog logEntry = importLogRepository.findById(logId).orElse(null);
        if (logEntry != null) {
            if (logEntry.getStoredFilePath() != null && !logEntry.getStoredFilePath().isBlank()) {
                try {
                    Files.deleteIfExists(Paths.get(logEntry.getStoredFilePath()));
                } catch (Exception ex) {
                    log.warn("Không thể xóa tệp vật lý {}: {}", logEntry.getStoredFilePath(), ex.getMessage());
                }
            }
            importLogRepository.deleteById(logId);
        }
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
        if (val == null) {
            for (Map.Entry<String, String> e : row.entrySet()) {
                if (e.getKey().equalsIgnoreCase(mappedHeaderName.trim())) {
                    val = e.getValue();
                    break;
                }
            }
        }
        return val != null ? val.trim() : null;
    }

    private String getValue(Map<String, String> row, Map<String, String> mapping, String targetField, String... fallbacks) {
        String mappedHeader = mapping != null ? mapping.get(targetField) : null;
        String val = getMappedValue(row, mappedHeader);
        if (val != null && !val.isBlank()) {
            return val;
        }
        // Direct targetField match
        val = getMappedValue(row, targetField);
        if (val != null && !val.isBlank()) {
            return val;
        }
        // Fallback synonyms directly against row headers
        for (String fb : fallbacks) {
            String fbNorm = fb.toLowerCase().replaceAll("[^a-z0-9]", "");
            for (Map.Entry<String, String> entry : row.entrySet()) {
                String keyNorm = entry.getKey().toLowerCase().replaceAll("[^a-z0-9]", "");
                if (keyNorm.equals(fbNorm) || (keyNorm.contains(fbNorm) && fbNorm.length() >= 4)) {
                    if (entry.getValue() != null && !entry.getValue().isBlank()) {
                        return entry.getValue().trim();
                    }
                }
            }
        }
        return null;
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
            return LocalDateTime.now();
        }
        String clean = dateStr.trim();
        String[] patterns = {
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd HH:mm",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss.SSS",
                "dd/MM/yyyy HH:mm:ss",
                "dd/MM/yyyy HH:mm",
                "M/d/yyyy HH:mm:ss",
                "M/d/yyyy H:mm:ss",
                "M/d/yyyy HH:mm",
                "M/d/yyyy H:mm",
                "yyyy/MM/dd HH:mm:ss",
                "yyyy-MM-dd",
                "dd/MM/yyyy",
                "dd-MM-yyyy",
                "M/d/yyyy"
        };
        for (String pattern : patterns) {
            try {
                if (pattern.contains("HH") || pattern.contains("H:mm")) {
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

        return LocalDateTime.now();
    }
}
