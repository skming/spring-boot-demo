package com.example.dblab.lab.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.dblab.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class SqlGuardTest {

    private final SqlGuard sqlGuard = new SqlGuard();

    @Test
    void statementKindsHaveChineseLabelsAndKeepTheirIdentifiers() {
        String[] names = {"SELECT", "INSERT", "UPDATE", "DELETE"};
        String[] labels = {"查询", "新增", "更新", "删除"};
        for (int i = 0; i < names.length; i++) {
            StatementKind kind = StatementKind.valueOf(names[i]);
            assertEquals(names[i], kind.name());
            assertEquals(labels[i], kind.getLabel());
        }
    }

    @Test
    void acceptsSelect() {
        assertEquals("SELECT id FROM movies", sqlGuard.validateAndNormalize("SELECT id FROM movies;"));
    }

    @Test
    void acceptsUpdateWithSetAndWhere() {
        assertEquals(
                "UPDATE movies SET watch_status = 'WATCHED' WHERE title = 'lab-insert-demo'",
                sqlGuard.validateAndNormalize(
                        "UPDATE movies SET watch_status = 'WATCHED' WHERE title = 'lab-insert-demo';"
                )
        );
    }

    @Test
    void acceptsMultilineUpdateWithWhere() {
        String sql = """
                UPDATE movies
                SET
                  watch_status = 'WATCHED',
                  notes = 'updated from Lab',
                  updated_at = CURRENT_TIMESTAMP
                WHERE title = 'lab-insert-demo'
                """;
        assertEquals(sql.trim(), sqlGuard.validateAndNormalize(sql));
    }

    @Test
    void rejectsBareSetStatement() {
        assertThrows(BusinessException.class, () -> sqlGuard.validateAndNormalize("SET search_path TO public"));
    }

    @Test
    void acceptsDeleteWithWhere() {
        assertEquals(
                "DELETE FROM movies WHERE watch_status = 'WANT_TO_WATCH'",
                sqlGuard.validateAndNormalize("DELETE FROM movies WHERE watch_status = 'WANT_TO_WATCH';")
        );
    }

    @Test
    void rejectsDeleteWithoutWhere() {
        assertThrows(BusinessException.class, () -> sqlGuard.validateAndNormalize("DELETE FROM movies"));
    }

    @Test
    void rejectsDrop() {
        assertThrows(BusinessException.class, () -> sqlGuard.validateAndNormalize("DROP TABLE movies"));
    }

    @Test
    void rejectsMultiStatement() {
        assertThrows(
                BusinessException.class,
                () -> sqlGuard.validateAndNormalize("SELECT 1; SELECT 2")
        );
    }
}
