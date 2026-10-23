package com.example.dblab.movie.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class GenresConverterTest {
    private final GenresConverter converter = new GenresConverter();

    @Test
    void normalizesWhitespaceDuplicatesOrderAndEscapedStrings() {
        List<String> genres = List.of(" 科幻 ", "剧情", "科幻", "类型\"与\\符号");
        assertEquals(List.of("剧情", "科幻", "类型\"与\\符号"),
                converter.convertToEntityAttribute(converter.convertToDatabaseColumn(genres)));
        assertEquals("[\"剧情\",\"科幻\"]", converter.convertToDatabaseColumn(List.of("科幻", "剧情")));
    }

    @Test
    void rejectsInvalidJsonShapeElementsAndBounds() {
        for (String value : new String[] {"not-json", "null", "{}", "[]", "[1]", "[null]", "[\" \" ]",
                "[\"" + "x".repeat(41) + "\"]", "[1,2,3,4,5,6,7,8,9]"}) {
            assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute(value));
        }
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToDatabaseColumn(null));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToDatabaseColumn(List.of()));
    }

    @Test
    void acceptsMaximumNumberAndLengthOfGenres() {
        List<String> genres = List.of("x".repeat(40), "b", "c", "d", "e", "f", "g", "h");
        assertEquals(8, converter.convertToEntityAttribute(converter.convertToDatabaseColumn(genres)).size());
    }
}
