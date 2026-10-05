package com.cd1.rfmanalytics.service.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.io.FileReader;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class MultiFormatFileParser {

    private final ObjectMapper objectMapper;

    public record ParsedFileData(
            String format,
            List<String> headers,
            List<Map<String, String>> rows,
            int totalRows
    ) {}

    /**
     * Tự động nhận diện định dạng (CSV, EXCEL, JSON, XML) và phân tích cú pháp tệp.
     */
    public ParsedFileData parse(Path filePath, String originalFilename) throws Exception {
        String format = detectFormat(filePath, originalFilename);
        log.info("Parsing file '{}' recognized as format: {}", originalFilename, format);

        return switch (format) {
            case "EXCEL" -> parseExcel(filePath);
            case "JSON" -> parseJson(filePath);
            case "XML" -> parseXml(filePath);
            default -> parseCsv(filePath);
        };
    }

    /**
     * Nhận diện định dạng tệp dựa theo phần mở rộng hoặc nội dung
     */
    public String detectFormat(Path filePath, String originalFilename) {
        String filename = originalFilename != null ? originalFilename.toLowerCase() : "";

        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return "EXCEL";
        }
        if (filename.endsWith(".json")) {
            return "JSON";
        }
        if (filename.endsWith(".xml")) {
            return "XML";
        }
        if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
            return "CSV";
        }

        // Kiểm tra nội dung nếu phần mở rộng không rõ ràng
        try {
            byte[] bytes = Files.readAllBytes(filePath);
            if (bytes.length >= 4) {
                // PK.. (ZIP archive -> xlsx)
                if (bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04) {
                    return "EXCEL";
                }
                // OLE2 CFBF (.xls legacy)
                if (bytes[0] == (byte) 0xD0 && bytes[1] == (byte) 0xCF && bytes[2] == (byte) 0x11 && bytes[3] == (byte) 0xE0) {
                    return "EXCEL";
                }
            }

            String snippet = new String(bytes, 0, Math.min(bytes.length, 1024)).trim();
            if (snippet.startsWith("{") || snippet.startsWith("[")) {
                return "JSON";
            }
            if (snippet.startsWith("<")) {
                return "XML";
            }
        } catch (Exception e) {
            log.warn("Could not inspect file content for format detection: {}", e.getMessage());
        }

        return "CSV";
    }

    /**
     * Phân tích tệp CSV bằng OpenCSV
     */
    private ParsedFileData parseCsv(Path filePath) throws Exception {
        try (CSVReader reader = new CSVReader(new FileReader(filePath.toFile()))) {
            List<String[]> allRows = reader.readAll();
            if (allRows == null || allRows.isEmpty()) {
                throw new IllegalArgumentException("Tệp CSV rỗng hoặc không có dữ liệu");
            }

            String[] rawHeaders = allRows.get(0);
            List<String> headers = sanitizeHeaders(Arrays.asList(rawHeaders));

            List<Map<String, String>> rows = new ArrayList<>();
            for (int i = 1; i < allRows.size(); i++) {
                String[] line = allRows.get(i);
                if (line == null || line.length == 0 || (line.length == 1 && line[0].trim().isEmpty())) {
                    continue; // Skip blank lines
                }

                Map<String, String> rowMap = new LinkedHashMap<>();
                boolean hasContent = false;
                for (int j = 0; j < headers.size(); j++) {
                    String val = j < line.length ? line[j].trim() : "";
                    if (!val.isEmpty()) hasContent = true;
                    rowMap.put(headers.get(j), val);
                }
                if (hasContent) {
                    rows.add(rowMap);
                }
            }

            return new ParsedFileData("CSV", headers, rows, rows.size());
        }
    }

    /**
     * Phân tích tệp Excel (.xlsx, .xls) bằng Apache POI
     */
    private ParsedFileData parseExcel(Path filePath) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(filePath.toFile())) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new IllegalArgumentException("Tệp Excel không chứa sheet nào");
            }

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new IllegalArgumentException("Sheet đầu tiên trong tệp Excel không có dữ liệu");
            }

            DataFormatter formatter = new DataFormatter();

            // Tìm dòng tiêu đề đầu tiên không rỗng
            Row headerRow = null;
            int firstRowNum = sheet.getFirstRowNum();
            int lastRowNum = sheet.getLastRowNum();
            for (int r = firstRowNum; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row != null && row.getPhysicalNumberOfCells() > 0) {
                    headerRow = row;
                    firstRowNum = r;
                    break;
                }
            }

            if (headerRow == null) {
                throw new IllegalArgumentException("Không tìm thấy dòng tiêu đề trong tệp Excel");
            }

            int minColIx = headerRow.getFirstCellNum();
            int maxColIx = headerRow.getLastCellNum();
            List<String> rawHeaders = new ArrayList<>();

            for (int colIx = minColIx; colIx < maxColIx; colIx++) {
                Cell cell = headerRow.getCell(colIx);
                String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                if (val.isEmpty()) {
                    val = "Cot_" + (colIx - minColIx + 1);
                }
                rawHeaders.add(val);
            }

            List<String> headers = sanitizeHeaders(rawHeaders);
            List<Map<String, String>> rows = new ArrayList<>();

            for (int r = firstRowNum + 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, String> rowMap = new LinkedHashMap<>();
                boolean hasContent = false;

                for (int c = 0; c < headers.size(); c++) {
                    int colIndex = minColIx + c;
                    Cell cell = row.getCell(colIndex);
                    String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                    if (!val.isEmpty()) hasContent = true;
                    rowMap.put(headers.get(c), val);
                }

                if (hasContent) {
                    rows.add(rowMap);
                }
            }

            return new ParsedFileData("EXCEL", headers, rows, rows.size());
        }
    }

    /**
     * Phân tích tệp JSON bằng Jackson
     * Hỗ trợ mảng các object: [ {...}, {...} ]
     * hoặc object chứa thuộc tính mảng: { "data": [ {...} ] }
     */
    private ParsedFileData parseJson(Path filePath) throws Exception {
        JsonNode rootNode = objectMapper.readTree(filePath.toFile());
        List<JsonNode> recordNodes = new ArrayList<>();

        if (rootNode.isArray()) {
            for (JsonNode item : rootNode) {
                if (item.isObject()) {
                    recordNodes.add(item);
                }
            }
        } else if (rootNode.isObject()) {
            // Tìm thuộc tính mảng đầu tiên chứa objects
            Iterator<Map.Entry<String, JsonNode>> fields = rootNode.fields();
            boolean foundNestedArray = false;
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                if (entry.getValue().isArray() && entry.getValue().size() > 0) {
                    for (JsonNode item : entry.getValue()) {
                        if (item.isObject()) {
                            recordNodes.add(item);
                            foundNestedArray = true;
                        }
                    }
                    if (foundNestedArray) break;
                }
            }

            // Nếu không có mảng con, coi object gốc là 1 bản ghi
            if (!foundNestedArray) {
                recordNodes.add(rootNode);
            }
        }

        if (recordNodes.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy bản ghi dữ liệu hợp lệ trong tệp JSON");
        }

        // Gom các khóa thuộc tính duy nhất
        Set<String> headerSet = new LinkedHashSet<>();
        for (JsonNode node : recordNodes) {
            Iterator<String> fieldNames = node.fieldNames();
            while (fieldNames.hasNext()) {
                headerSet.add(fieldNames.next().trim());
            }
        }

        List<String> headers = sanitizeHeaders(new ArrayList<>(headerSet));
        List<Map<String, String>> rows = new ArrayList<>();

        for (JsonNode node : recordNodes) {
            Map<String, String> rowMap = new LinkedHashMap<>();
            boolean hasContent = false;

            for (String header : headers) {
                JsonNode valNode = node.get(header);
                String val = "";
                if (valNode != null && !valNode.isNull()) {
                    if (valNode.isValueNode()) {
                        val = valNode.asText().trim();
                    } else {
                        val = valNode.toString().trim();
                    }
                }
                if (!val.isEmpty()) hasContent = true;
                rowMap.put(header, val);
            }

            if (hasContent) {
                rows.add(rowMap);
            }
        }

        return new ParsedFileData("JSON", headers, rows, rows.size());
    }

    /**
     * Phân tích tệp XML bằng DOM DocumentBuilder
     * Tự động quét phần tử lặp lại (ví dụ <customers><customer>...</customer></customers>)
     */
    private ParsedFileData parseXml(Path filePath) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Bảo vệ chống tấn công XXE
        try {
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        } catch (Exception ignored) {}
        factory.setNamespaceAware(false);

        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(filePath.toFile());
        doc.getDocumentElement().normalize();

        Element root = doc.getDocumentElement();

        // Thu thập các phần tử con là thẻ bản ghi
        List<Element> recordElements = extractRecordElements(root);
        if (recordElements.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy các thẻ bản ghi dữ liệu trong tệp XML");
        }

        // Quét tất cả attribute và child tag để lập danh sách header
        Set<String> headerSet = new LinkedHashSet<>();
        for (Element el : recordElements) {
            // Attributes
            NamedNodeMap attrs = el.getAttributes();
            if (attrs != null) {
                for (int i = 0; i < attrs.getLength(); i++) {
                    Node attr = attrs.item(i);
                    headerSet.add(attr.getNodeName().trim());
                }
            }
            // Child elements
            NodeList children = el.getChildNodes();
            for (int i = 0; i < children.getLength(); i++) {
                Node node = children.item(i);
                if (node.getNodeType() == Node.ELEMENT_NODE) {
                    headerSet.add(node.getNodeName().trim());
                }
            }
        }

        List<String> headers = sanitizeHeaders(new ArrayList<>(headerSet));
        List<Map<String, String>> rows = new ArrayList<>();

        for (Element el : recordElements) {
            Map<String, String> rowMap = new LinkedHashMap<>();
            boolean hasContent = false;

            // Đọc attribute
            NamedNodeMap attrs = el.getAttributes();
            if (attrs != null) {
                for (int i = 0; i < attrs.getLength(); i++) {
                    Node attr = attrs.item(i);
                    String name = attr.getNodeName().trim();
                    String val = attr.getNodeValue() != null ? attr.getNodeValue().trim() : "";
                    if (!val.isEmpty()) hasContent = true;
                    rowMap.put(name, val);
                }
            }

            // Đọc thẻ con
            NodeList children = el.getChildNodes();
            for (int i = 0; i < children.getLength(); i++) {
                Node node = children.item(i);
                if (node.getNodeType() == Node.ELEMENT_NODE) {
                    String name = node.getNodeName().trim();
                    String val = node.getTextContent() != null ? node.getTextContent().trim() : "";
                    if (!val.isEmpty()) hasContent = true;
                    rowMap.put(name, val);
                }
            }

            // Đảm bảo đủ các header
            for (String h : headers) {
                rowMap.putIfAbsent(h, "");
            }

            if (hasContent) {
                rows.add(rowMap);
            }
        }

        return new ParsedFileData("XML", headers, rows, rows.size());
    }

    /**
     * Tìm danh sách thẻ bản ghi lặp lại trong tài liệu XML
     */
    private List<Element> extractRecordElements(Element root) {
        List<Element> directChildren = getChildElements(root);
        if (directChildren.isEmpty()) {
            return Collections.emptyList();
        }

        // Nếu root chỉ có đúng 1 child wrapper (ví dụ <dataset><records>...</records></dataset>)
        if (directChildren.size() == 1) {
            List<Element> subChildren = getChildElements(directChildren.get(0));
            if (!subChildren.isEmpty()) {
                return subChildren;
            }
        }

        return directChildren;
    }

    private List<Element> getChildElements(Element parent) {
        List<Element> elements = new ArrayList<>();
        NodeList list = parent.getChildNodes();
        for (int i = 0; i < list.getLength(); i++) {
            Node node = list.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                elements.add((Element) node);
            }
        }
        return elements;
    }

    /**
     * Khử trùng lặp và làm sạch tiêu đề cột
     */
    private List<String> sanitizeHeaders(List<String> rawHeaders) {
        List<String> cleanHeaders = new ArrayList<>();
        Map<String, Integer> seenCount = new HashMap<>();

        for (String raw : rawHeaders) {
            String name = raw != null ? raw.trim().replaceAll("^[\\uFEFF-\\uFFFF]", "") : "";
            if (name.isEmpty()) {
                name = "Cot_" + (cleanHeaders.size() + 1);
            }

            int count = seenCount.getOrDefault(name, 0);
            if (count > 0) {
                String uniqueName = name + "_" + (count + 1);
                seenCount.put(name, count + 1);
                cleanHeaders.add(uniqueName);
            } else {
                seenCount.put(name, 1);
                cleanHeaders.add(name);
            }
        }

        return cleanHeaders;
    }
}
