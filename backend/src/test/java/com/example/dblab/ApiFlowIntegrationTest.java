package com.example.dblab;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.dblab.support.MySqlTestSupport;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("mysql")
class ApiFlowIntegrationTest extends MySqlTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void mysqlSupportsUnicodeConstraintsCascadeAndFullAuditSnapshots() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String password = UUID.randomUUID().toString();
        var authResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isCreated()).andReturn();
        var account = json.readTree(authResult.getResponse().getContentAsString()).path("data");
        String token = "Bearer " + account.path("accessToken").asText();
        String ownerId = account.path("userId").asText();
        var created = mockMvc.perform(post("/api/v1/movies").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("title", "观影🎬", "director", "教学导演", "releaseYear", 2014, "genres", List.of("剧情"), "notes", "备注😀"))))
                .andExpect(status().isCreated()).andReturn();
        String movieId = json.readTree(created.getResponse().getContentAsString()).path("data").path("id").asText();
        var watched = mockMvc.perform(post("/api/v1/movies/" + movieId + "/watch-records").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("watchedOn", "2026-01-01", "rating", 5, "notes", "笔记🎞️"))))
                .andExpect(status().isCreated()).andReturn();
        String recordId = json.readTree(watched.getResponse().getContentAsString()).path("data")
                .path("watchRecords").get(0).path("id").asText();
        mockMvc.perform(get("/api/v1/movies/" + movieId).header("Authorization", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("观影🎬"))
                .andExpect(jsonPath("$.data.notes").value("备注😀"))
                .andExpect(jsonPath("$.data.watchRecords[0].notes").value("笔记🎞️"));

        for (String sql : List.of(
                "UPDATE movies SET genres = '[]' WHERE id = '" + movieId + "'",
                "UPDATE movies SET genres = 'invalid-json' WHERE id = '" + movieId + "'",
                "UPDATE watch_records SET rating = 6 WHERE id = '" + recordId + "'",
                "UPDATE watch_records SET movie_id = 'missing' WHERE id = '" + recordId + "'")) {
            mockMvc.perform(post("/api/v1/lab/query").header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("sql", sql))))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400));
        }
        mockMvc.perform(get("/api/v1/lab/tables/watch_records").header("Authorization", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.primaryKeys[0]").value("id"));

        String snapshot = "完整审计😀".repeat(15000);
        String logId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO operation_logs (id, user_id, action, resource_type, detail, success, created_at) "
                        + "VALUES (?, ?, 'TEST_SNAPSHOT', 'movie', ?, true, CURRENT_TIMESTAMP)", logId, ownerId, snapshot);
        org.junit.jupiter.api.Assertions.assertEquals(snapshot,
                jdbc.queryForObject("SELECT detail FROM operation_logs WHERE id = ?", String.class, logId));

        mockMvc.perform(post("/api/v1/lab/query").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("sql", "DELETE FROM movies WHERE id = '" + movieId + "'"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.affectedRows").value(1));
        org.junit.jupiter.api.Assertions.assertEquals(0,
                jdbc.queryForObject("SELECT COUNT(*) FROM watch_records WHERE movie_id = ?", Integer.class, movieId));
    }

    @Test
    void registerCreateMovieAndQueryLab() throws Exception {
        String email = "learner@example.com";
        String password = "password123";

        MvcResult authResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();

        String authBody = authResult.getResponse().getContentAsString();
        String token = authBody.replaceAll("(?s).*\\\"accessToken\\\"\\s*:\\s*\\\"([^\\\"]+)\\\".*", "$1");

        mockMvc.perform(post("/api/v1/movies")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"learn sql","director":"教学导演","releaseYear":2014,"genres":["科幻"],"notes":"from lab"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("learn sql"));

        mockMvc.perform(get("/api/v1/movies")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("learn sql"));

        mockMvc.perform(post("/api/v1/lab/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sql":"SELECT title FROM movies ORDER BY created_at DESC"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rowCount").value(1))
                .andExpect(jsonPath("$.data.rows[0].title").value("learn sql"));

        mockMvc.perform(post("/api/v1/lab/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sql":"DELETE FROM movies"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/lab/query")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sql":"DELETE FROM movies WHERE title = 'learn sql'"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statementType").value("DELETE"))
                .andExpect(jsonPath("$.data.affectedRows").value(1));
    }
}
