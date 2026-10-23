package com.example.dblab.lab.service;

import com.example.dblab.common.exception.BusinessException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Lab SQL 白名单校验。
 * <p>
 * 允许教学常用：SELECT / INSERT / UPDATE / DELETE / EXPLAIN。
 * 仍禁止 DDL、权限变更、多语句等危险操作。
 * UPDATE/DELETE 必须带 WHERE，降低误删全表风险。
 * 这是关键词级教学保护，不是完整解析器，也不保证只访问当前用户的数据。
 */
@Component
public class SqlGuard {

    /** 拒绝 "SELECT 1; DROP ..." 这类多语句。 */
    private static final Pattern MULTI_STATEMENT = Pattern.compile(";\\s*\\S", Pattern.DOTALL);

    /** 兼容换行：WHERE 前可能是空格或换行，不能只查 " WHERE "。 */
    private static final Pattern HAS_WHERE = Pattern.compile("(?s).*\\bWHERE\\b.*");

    // 注意：不要把 UPDATE 子句里的 SET 放进黑名单。
    // SET/RESET/SHOW 作为语句开头时，会被 detectKind 直接拒绝。
    private static final Set<String> BLOCKED = Set.of(
            "MERGE", "UPSERT",
            "CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME",
            "GRANT", "REVOKE", "COPY", "CALL", "DO", "EXECUTE",
            "LISTEN", "NOTIFY", "VACUUM",
            "CLUSTER", "REINDEX", "COMMENT", "SECURITY",
            "ATTACH", "DETACH", "PRAGMA", "REPLACE"
    );

    public String validateAndNormalize(String rawSql) {
        if (rawSql == null || rawSql.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SQL must not be blank");
        }
        String sql = stripLeadingLineComments(rawSql.trim());
        if (sql.endsWith(";")) {
            sql = sql.substring(0, sql.length() - 1).trim();
        }
        if (MULTI_STATEMENT.matcher(sql).find()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Only a single SQL statement is allowed");
        }

        String upper = sql.toUpperCase(Locale.ROOT);
        StatementKind kind = detectKindFromUpper(upper);
        if (kind == null) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "Only SELECT / INSERT / UPDATE / DELETE / EXPLAIN statements are allowed"
            );
        }

        for (String token : upper.split("[^A-Z_]+")) {
            if (BLOCKED.contains(token)) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST,
                        "Statement contains blocked keyword: " + token
                );
            }
        }

        if ((kind == StatementKind.UPDATE || kind == StatementKind.DELETE) && !HAS_WHERE.matcher(upper).matches()) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "UPDATE/DELETE must include a WHERE clause (teaching safeguard)"
            );
        }

        return sql;
    }

    public StatementKind detectKind(String rawSql) {
        String normalized = stripLeadingLineComments(rawSql.trim());
        String upper = normalized.toUpperCase(Locale.ROOT);
        return detectKindFromUpper(upper);
    }

    private static String stripLeadingLineComments(String sql) {
        String current = sql;
        while (current.startsWith("--")) {
            int newLine = current.indexOf('\n');
            if (newLine < 0) {
                return "";
            }
            current = current.substring(newLine + 1).trim();
        }
        return current;
    }

    private static StatementKind detectKindFromUpper(String upper) {
        if (upper.startsWith("SELECT") || upper.startsWith("WITH") || upper.startsWith("EXPLAIN")) {
            return StatementKind.SELECT;
        }
        if (upper.startsWith("INSERT")) {
            return StatementKind.INSERT;
        }
        if (upper.startsWith("UPDATE")) {
            return StatementKind.UPDATE;
        }
        if (upper.startsWith("DELETE")) {
            return StatementKind.DELETE;
        }
        return null;
    }

}
