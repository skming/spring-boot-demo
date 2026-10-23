package com.example.dblab;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.dblab.config.AppProperties;
import com.example.dblab.security.JwtService;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;

@SpringBootTest(properties = "logging.level.org.springframework.boot=ERROR")
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("sqlite")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SqliteApiFlowIntegrationTest {
    @TempDir static Path directory;
    @Autowired MockMvc mvc;
    @Autowired AppProperties properties;
    private final ObjectMapper json = new ObjectMapper();
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:" + directory.resolve("flow.sqlite");
        registry.add("spring.datasource.url", () -> url);
        registry.add("app.lab.datasource.url", () -> url);
        registry.add("app.security.jwt-secret", () -> UUID.randomUUID().toString());
        registry.add("app.lab.max-rows", () -> 2);
        registry.add("app.lab.statement-timeout-ms", () -> 500);
    }

    @Test
    void releaseYearRoundTripsWithoutChangingViewingHistoryAndIsAudited() throws Exception {
        Session owner = register();
        Session other = register();
        var input = new LinkedHashMap<String, Object>(movie("星际穿越"));
        input.put("releaseYear", 2014);
        JsonNode created = read(request(post("/api/v1/movies"), owner, input)
                .andExpect(status().isCreated()));
        assertTrue(created.path("releaseYear").isInt());
        assertEquals(2014, created.path("releaseYear").asInt());
        String id = created.path("id").asText();
        watch(owner, id, "2026-01-01", 5, "重看笔记");
        JsonNode watched = read(request(get("/api/v1/movies/" + id), owner, null));
        input.put("releaseYear", 1994);
        JsonNode updated = read(request(put("/api/v1/movies/" + id), owner, input)
                .andExpect(status().isOk()));
        assertEquals(1994, updated.path("releaseYear").asInt());
        assertEquals(watched.path("watchRecords"), updated.path("watchRecords"));
        request(get("/api/v1/movies/" + id), owner, null)
                .andExpect(jsonPath("$.data.releaseYear").value(1994));
        request(get("/api/v1/movies"), owner, null)
                .andExpect(jsonPath("$.data[0].releaseYear").value(1994));
        query(owner, "SELECT release_year FROM movies WHERE id = '" + id + "'")
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.rows[0].release_year").value(1994));
        request(get("/api/v1/movies/" + id), other, null).andExpect(status().isNotFound());
        request(put("/api/v1/movies/" + id), other, input).andExpect(status().isNotFound());
        assertTrue(read(request(get("/api/v1/movies"), other, null)).isEmpty());

        JsonNode logs = read(request(get("/api/v1/operation-logs").param("size", "100"), owner, null));
        boolean creation = false, update = false;
        for (JsonNode log : logs.path("content")) {
            if (!id.equals(log.path("resourceId").asText())) continue;
            JsonNode detail = json.readTree(log.path("detail").asText());
            int before = detail.path("before").path("releaseYear").asInt();
            JsonNode after = detail.path("after").path("releaseYear");
            creation |= "MOVIE_CREATE".equals(log.path("action").asText()) && after.asInt() == 2014;
            update |= before == 2014 && after.asInt() == 1994;
        }
        assertTrue(creation, "creation audit includes releaseYear");
        assertTrue(update, "update audit includes both years");
    }

    @Test
    void releaseYearIsRequiredAndValidatesBothCreateAndUpdate() throws Exception {
        Session session = register();
        String id = create(session);
        request(get("/api/v1/movies/" + id), session, null)
                .andExpect(jsonPath("$.data.releaseYear").value(2014));
        var input = new LinkedHashMap<String, Object>(movie("年份边界"));
        for (Integer year : List.of(1888, 2100)) {
            input.put("releaseYear", year);
            JsonNode created = read(request(post("/api/v1/movies"), session, input)
                    .andExpect(status().isCreated()));
            assertEquals(json.valueToTree(year), created.path("releaseYear"));
            JsonNode updated = read(request(put("/api/v1/movies/" + id), session, input)
                    .andExpect(status().isOk()));
            assertEquals(json.valueToTree(year), updated.path("releaseYear"));
        }
        for (boolean explicitNull : List.of(false, true)) {
            if (explicitNull) input.put("releaseYear", null);
            else input.remove("releaseYear");
            request(post("/api/v1/movies"), session, input).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.fieldErrors.releaseYear").isNotEmpty());
            request(put("/api/v1/movies/" + id), session, input).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.fieldErrors.releaseYear").isNotEmpty());
        }
        for (Object invalid : List.of(1887, 2101, 2014.5, "not-a-year", 2147483648L)) {
            input.put("releaseYear", invalid);
            request(post("/api/v1/movies"), session, input).andExpect(status().isBadRequest());
            request(put("/api/v1/movies/" + id), session, input).andExpect(status().isBadRequest());
        }
        request(get("/api/v1/movies/" + id), session, null)
                .andExpect(jsonPath("$.data.releaseYear").value(2100));
        assertEquals(3, read(request(get("/api/v1/movies"), session, null)).size());
        for (String invalid : List.of("NULL", "1887", "2101", "2014.5")) {
            query(session, "UPDATE movies SET release_year = " + invalid + " WHERE id = '" + id + "'")
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void directorIsRequiredForCreateAndUpdate() throws Exception {
        Session session = register();
        String id = create(session);
        for (String director : java.util.Arrays.asList(null, "", " \t\n", "x".repeat(101))) {
            var input = new LinkedHashMap<String, Object>(movie("导演校验"));
            input.put("director", director);
            request(post("/api/v1/movies"), session, input).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.fieldErrors.director").isNotEmpty());
            request(put("/api/v1/movies/" + id), session, input).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.fieldErrors.director").isNotEmpty());
        }
        var missing = new LinkedHashMap<String, Object>(movie("导演缺失"));
        missing.remove("director");
        request(post("/api/v1/movies"), session, missing).andExpect(status().isBadRequest());
        request(put("/api/v1/movies/" + id), session, missing).andExpect(status().isBadRequest());
        var valid = new LinkedHashMap<String, Object>(movie("导演边界"));
        valid.put("director", "x".repeat(100));
        request(put("/api/v1/movies/" + id), session, valid).andExpect(status().isOk());
        valid.put("director", "  克里斯托弗·诺兰  ");
        request(put("/api/v1/movies/" + id), session, valid).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.director").value("克里斯托弗·诺兰"));
        for (String invalid : List.of("NULL", "''", "'   '")) {
            query(session, "UPDATE movies SET director = " + invalid + " WHERE id = '" + id + "'")
                    .andExpect(status().isBadRequest());
        }
        assertEquals(1, read(request(get("/api/v1/movies"), session, null)).size());
    }

    @Test
    void responseEnvelopeCoversSuccessValidationAndHttpErrors() throws Exception {
        Session session = register();
        request(post("/api/v1/movies"), session, Map.of("title", "", "genres", List.of("剧情")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.fieldErrors.title").isNotEmpty())
                .andExpect(jsonPath("$.data.path").value("/api/v1/movies"))
                .andExpect(jsonPath("$.data.timestamp").isNotEmpty());
        mvc.perform(get("/api/v1/movies"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
        request(get("/api/v1/movies/" + UUID.randomUUID()), session, null)
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(404));
        request(patch("/api/v1/movies"), session, null)
                .andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.code").value(405));
        request(get("/api/v1/missing"), session, null)
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value(404));
        String id = create(session);
        JsonNode deleted = read(request(delete("/api/v1/movies/" + id), session, null).andExpect(status().isOk()));
        assertTrue(deleted.isNull());
        JsonNode reset = read(request(post("/api/v1/learning/sandbox/reset"), session, null).andExpect(status().isOk()));
        assertTrue(reset.isNull());
        assertTrue(read(request(get("/api/v1/lab/tables"), session, null)).isArray());
        assertTrue(read(request(get("/api/v1/lab/tables/movies"), session, null)).isObject());
        assertTrue(read(request(get("/api/v1/operation-logs"), session, null)).path("content").isArray());
        assertTrue(read(request(get("/api/v1/operation-logs/stats"), session, null)).has("total"));
    }

    @Test
    void authenticationAndEnumContracts() throws Exception {
        for (String path : List.of("/api/v1/movies", "/api/v1/movies/watch-statuses", "/api/v1/lab/tables", "/api/v1/operation-logs")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized()).andExpect(header().string("WWW-Authenticate", "Bearer"));
            mvc.perform(get(path).header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
        }
        var expired = new AppProperties();
        expired.getSecurity().setJwtSecret(properties.getSecurity().getJwtSecret());
        expired.getSecurity().setJwtExpirationMinutes(-1);
        for (String token : List.of(new JwtService(expired).createToken(UUID.randomUUID(), "expired@example.test"),
                new JwtService(properties).createToken(UUID.randomUUID(), "missing@example.test"))) {
            mvc.perform(get("/api/v1/movies").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("未登录或登录已过期"));
        }
        Session session = register();
        request(post("/api/v1/auth/login"), null, Map.of("email", session.email(), "password", session.password()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.userId").value(session.id()));
        request(post("/api/v1/auth/login"), null, Map.of("email", session.email(), "password", "wrong-password"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/movies/watch-statuses").header("Authorization", session.authorization()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[1].value").value("WATCHED"))
                .andExpect(jsonPath("$.data[1].label").value("已看"));
    }

    @Test
    void repeatedViewingHasIndependentFactsAndDerivedSummary() throws Exception {
        Session session = register();
        String id = create(session);
        var first = watch(session, id, "2026-01-01", 5, "首看");
        String firstId = first.path("watchRecords").get(0).path("id").asText();
        var repeated = watch(session, id, "2026-02-01", 2, "重看");
        assertEquals(2, repeated.path("watchRecords").size());
        assertEquals(2, repeated.path("rating").asInt());
        assertEquals("2026-02-01", repeated.path("watchedOn").asText());
        assertEquals("已看", repeated.path("watchStatusLabel").asText());
        request(put("/api/v1/movies/" + id), session, movie("新版片名"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.watchRecords.length()").value(2));
        request(put("/api/v1/movies/" + id + "/watch-records/" + firstId), session,
                Map.of("watchedOn", "2026-03-01", "rating", 4, "notes", "修正日期"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.rating").value(4))
                .andExpect(jsonPath("$.data.watchRecords[1].notes").value("重看"));
        var afterDelete = read(request(delete("/api/v1/movies/" + id + "/watch-records/" + firstId), session, null)
                .andExpect(status().isOk()));
        assertEquals(1, afterDelete.path("watchRecords").size());
        String lastId = afterDelete.path("watchRecords").get(0).path("id").asText();
        request(delete("/api/v1/movies/" + id + "/watch-records/" + lastId), session, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.watchStatus").value("WANT_TO_WATCH"))
                .andExpect(jsonPath("$.data.rating").isEmpty()).andExpect(jsonPath("$.data.watchedOn").isEmpty())
                .andExpect(jsonPath("$.data.notes").value("想看理由"));
    }

    @Test
    void ownerAndParentBoundariesCoverAllViewingOperations() throws Exception {
        Session owner = register();
        Session other = register();
        String id = create(owner);
        var watched = watch(owner, id, "2026-01-01", 5, "only mine");
        String recordId = watched.path("watchRecords").get(0).path("id").asText();
        String differentMovie = create(owner);
        for (String deniedId : List.of(id, differentMovie)) {
            Session caller = deniedId.equals(id) ? other : owner;
            String path = "/api/v1/movies/" + deniedId + "/watch-records/" + recordId;
            request(put(path), caller, Map.of("watchedOn", "2026-01-01")).andExpect(status().isNotFound());
            request(delete(path), caller, null).andExpect(status().isNotFound());
        }
        request(post("/api/v1/movies/" + id + "/watch-records"), other, Map.of("watchedOn", "2026-01-01"))
                .andExpect(status().isNotFound());
        request(get("/api/v1/movies/" + id), other, null).andExpect(status().isNotFound());
        request(put("/api/v1/movies/" + id), other, movie("denied")).andExpect(status().isNotFound());
        request(delete("/api/v1/movies/" + id), other, null).andExpect(status().isNotFound());
        request(get("/api/v1/movies"), other, null).andExpect(jsonPath("$.data").isEmpty());
        request(get("/api/v1/operation-logs/stats"), other, null).andExpect(jsonPath("$.data.total").value(1));
    }

    @Test
    void viewingValidationCoversNullDatesFutureDatesAndRatingBounds() throws Exception {
        Session session = register();
        String id = create(session);
        var obsoleteRequest = new LinkedHashMap<String, Object>(movie("old fields rejected"));
        obsoleteRequest.put("watchStatus", "WATCHED");
        request(post("/api/v1/movies"), session, obsoleteRequest).andExpect(status().isBadRequest());
        for (Map<String, Object> invalid : List.<Map<String, Object>>of(Map.of(), Map.of("watchedOn", "bad-date"),
                Map.of("watchedOn", LocalDate.now().plusDays(1).toString()),
                Map.of("watchedOn", "2026-01-01", "rating", 0), Map.of("watchedOn", "2026-01-01", "rating", 6),
                Map.of("watchedOn", "2026-01-01", "rating", 1.5),
                Map.of("watchedOn", "2026-01-01", "notes", "x".repeat(1001)))) {
            request(post("/api/v1/movies/" + id + "/watch-records"), session, invalid).andExpect(status().isBadRequest());
        }
        for (int rating : new int[] {1, 5}) watch(session, id, LocalDate.now().toString(), rating, "valid");
        request(post("/api/v1/movies/" + id + "/watch-records"), session, Map.of("watchedOn", "2026-01-01"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.watchRecords.length()").value(3));
        for (var invalid : List.of(Map.of("title", " "), Map.of("genres", List.of()), Map.of("genres", List.of(" ")),
                Map.of("genres", List.of("x".repeat(41))), Map.of("genres", List.of("1", "2", "3", "4", "5", "6", "7", "8", "9")))) {
            var body = new LinkedHashMap<String, Object>(movie("valid"));
            body.putAll(invalid);
            request(post("/api/v1/movies"), session, body).andExpect(status().isBadRequest());
            request(put("/api/v1/movies/" + id), session, body).andExpect(status().isBadRequest());
        }
    }

    @Test
    void sqlDistinguishesErrorsEmptyQueriesAndZeroAffectedRows() throws Exception {
        Session session = register();
        String id = create(session);
        query(session, "DELETE FROM movies WHERE id = '1'").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.affectedRows").value(0)).andExpect(jsonPath("$.data.auditRecorded").value(true));
        query(session, "SELECT title FROM movies WHERE id = '1'").andExpect(status().isOk()).andExpect(jsonPath("$.data.rowCount").value(0));
        for (String sql : List.of("SELECT FROM movies", "SELECT missing FROM movies", "SELECT * FROM missing_table",
                "UPDATE movies SET title = WHERE id = '1'", "DELETE FROM movies", "DROP TABLE movies", "SELECT 1; SELECT 2")) {
            query(session, sql).andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.statementType").doesNotExist());
        }
        request(get("/api/v1/movies/" + id), session, null).andExpect(status().isOk());
        request(get("/api/v1/operation-logs?success=false&size=2"), session, null)
                .andExpect(jsonPath("$.data.totalElements").value(7)).andExpect(jsonPath("$.data.totalPages").value(4));
        query(session, "SELECT 1 AS value UNION ALL SELECT 2 UNION ALL SELECT 3")
                .andExpect(jsonPath("$.data.rowCount").value(2)).andExpect(jsonPath("$.data.truncated").value(true));
        query(session, "SELECT 1 AS value UNION ALL SELECT 2").andExpect(jsonPath("$.data.truncated").value(false));
    }

    @Test
    void sqlAndApiDeletesCascadeButKeepAuditSnapshots() throws Exception {
        Session session = register();
        for (boolean viaSql : List.of(true, false)) {
            String id = create(session);
            watch(session, id, "2026-01-01", 5, "笔记".repeat(300));
            var original = read(request(get("/api/v1/movies/" + id), session, null));
            if (viaSql) query(session, "DELETE FROM movies WHERE id = '" + id + "'").andExpect(jsonPath("$.data.affectedRows").value(1));
            else request(delete("/api/v1/movies/" + id), session, null).andExpect(status().isOk());
            query(session, "SELECT COUNT(*) AS count FROM watch_records WHERE movie_id = '" + id + "'")
                    .andExpect(jsonPath("$.data.rows[0].count").value(0));
            if (!viaSql) {
                var entries = read(request(get("/api/v1/operation-logs?size=100"), session, null)).path("content");
                boolean found = false;
                for (var log : entries) if (log.path("action").asText().equals("MOVIE_DELETE")) {
                    assertEquals(original, json.readTree(log.path("detail").asText()).path("before"));
                    found = true;
                }
                assertTrue(found);
            }
        }
    }

    @Test
    void sqlForeignKeysAndRatingConstraintsRemainEnforced() throws Exception {
        Session session = register();
        String id = create(session);
        String recordId = watch(session, id, "2026-01-01", 5, "valid").path("watchRecords").get(0).path("id").asText();
        for (String set : List.of("rating = 0", "rating = 6", "rating = 1.5", "movie_id = 'missing-parent'", "watched_on = NULL")) {
            query(session, "UPDATE watch_records SET " + set + " WHERE id = '" + recordId + "'").andExpect(status().isBadRequest());
        }
        query(session, "UPDATE movies SET genres = '[]' WHERE id = '" + id + "'").andExpect(status().isBadRequest());
        request(get("/api/v1/lab/tables/watch_records"), session, null).andExpect(status().isOk());
    }

    @Test
    void learningSandboxIsIsolatedResettableAndContainsNoRealAuthenticationData() throws Exception {
        Session owner = register();
        Session other = register();
        String actualMovie = create(owner);
        String endpoint = "/api/v1/learning/sandbox/query";
        request(post(endpoint), null, Map.of("sql", "SELECT 1")).andExpect(status().isUnauthorized());
        request(post(endpoint), owner, Map.of("sql", "SELECT COUNT(*) AS count FROM movies"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.rows[0].count").value(3));
        request(post(endpoint), owner, Map.of("sql", "DELETE FROM movies WHERE title = '星际穿越'"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.affectedRows").value(1));
        request(post(endpoint), owner, Map.of("sql", "SELECT COUNT(*) AS count FROM watch_records"))
                .andExpect(jsonPath("$.data.rows[0].count").value(1));
        request(post(endpoint), other, Map.of("sql", "SELECT COUNT(*) AS count FROM watch_records"))
                .andExpect(jsonPath("$.data.rows[0].count").value(3));
        request(get("/api/v1/movies/" + actualMovie), owner, null).andExpect(status().isOk());
        for (String sql : List.of("SELECT password_hash FROM users", "ATTACH DATABASE '/tmp/other.sqlite' AS other",
                "PRAGMA database_list", "SELECT 1; DELETE FROM movies WHERE 1=1", " ", "x".repeat(5001))) {
            request(post(endpoint), owner, Map.of("sql", sql)).andExpect(status().isBadRequest());
        }
        for (int i = 0; i < 2; i++) {
            request(post("/api/v1/learning/sandbox/reset"), owner, null).andExpect(status().isOk());
            request(post(endpoint), owner, Map.of("sql", "SELECT COUNT(*) AS count FROM watch_records"))
                    .andExpect(jsonPath("$.data.rows[0].count").value(3));
        }
    }

    @Test
    void sandboxCancelsLongRunningSqlAndCannotLoadNativeExtensions() throws Exception {
        Session session = register();
        String endpoint = "/api/v1/learning/sandbox/query";
        request(post(endpoint), session, Map.of("sql", "SELECT load_extension('missing-teaching-extension')"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not authorized")));
        request(post(endpoint), session, Map.of("sql", "WITH RECURSIVE numbers(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM numbers) SELECT SUM(x) FROM numbers"))
                .andExpect(status().isBadRequest());
        request(post(endpoint), session, Map.of("sql", "SELECT COUNT(*) AS count FROM movies"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.rows[0].count").value(3));
    }

    private Session register() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String password = UUID.randomUUID().toString();
        JsonNode response = read(request(post("/api/v1/auth/register"), null, Map.of("email", email, "password", password))
                .andExpect(status().isCreated()));
        return new Session(response.path("userId").asText(), "Bearer " + response.path("accessToken").asText(), email, password);
    }
    private String create(Session session) throws Exception {
        return read(request(post("/api/v1/movies"), session, movie("教学电影"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.watchStatus").value("WANT_TO_WATCH")))
                .path("id").asText();
    }
    private Map<String, Object> movie(String title) {
        return Map.of("title", title, "director", "教学导演", "releaseYear", 2014, "genres", List.of("剧情", "科幻"), "notes", "想看理由");
    }
    private JsonNode watch(Session session, String id, String date, int rating, String notes) throws Exception {
        return read(request(post("/api/v1/movies/" + id + "/watch-records"), session,
                Map.of("watchedOn", date, "rating", rating, "notes", notes)).andExpect(status().isCreated()));
    }
    private ResultActions query(Session session, String sql) throws Exception {
        return request(post("/api/v1/lab/query"), session, Map.of("sql", sql));
    }
    private ResultActions request(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder,
                                  Session session, Object body) throws Exception {
        if (session != null) builder.header("Authorization", session.authorization());
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(builder);
    }
    private JsonNode read(ResultActions result) throws Exception {
        JsonNode envelope = json.readTree(result.andReturn().getResponse().getContentAsString());
        assertEquals(0, envelope.path("code").asInt(-1));
        assertFalse(envelope.path("message").asText().isBlank());
        assertTrue(envelope.has("data"));
        return envelope.path("data");
    }
    private record Session(String id, String authorization, String email, String password) {}
}
