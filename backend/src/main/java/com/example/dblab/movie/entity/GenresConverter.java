package com.example.dblab.movie.entity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

/** 用标准 JSON 编解码类型数组；列在 SQLite 和 MySQL 中均为 TEXT。 */
@Converter
public class GenresConverter implements AttributeConverter<List<String>, String> {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> genres) {
        try {
            return JSON.writeValueAsString(normalize(genres));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("电影类型无法序列化", ex);
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String value) {
        try {
            JsonNode array = value == null ? null : JSON.readTree(value);
            if (array == null || !array.isArray()) {
                throw new IllegalArgumentException("电影类型必须是 JSON 字符串数组");
            }
            List<String> genres = new ArrayList<>();
            for (JsonNode item : array) {
                if (!item.isTextual()) {
                    throw new IllegalArgumentException("电影类型必须是字符串");
                }
                genres.add(item.textValue());
            }
            return normalize(genres);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("电影类型 JSON 无效", ex);
        }
    }

    private static List<String> normalize(List<String> genres) {
        if (genres == null || genres.isEmpty() || genres.size() > 8
                || genres.stream().anyMatch(item -> item == null || item.isBlank() || item.length() > 40)) {
            throw new IllegalArgumentException("请选择 1–8 个类型，每个类型不超过 40 字");
        }
        return genres.stream().map(String::trim).distinct().sorted().toList();
    }
}
