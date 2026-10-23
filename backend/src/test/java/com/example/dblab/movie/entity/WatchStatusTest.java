package com.example.dblab.movie.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class WatchStatusTest {

    @Test
    void labelsDescribeStatusesWithoutChangingTheirJsonValues() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        assertEquals("想看", WatchStatus.WANT_TO_WATCH.getLabel());
        assertEquals("已看", WatchStatus.WATCHED.getLabel());
        for (WatchStatus status : WatchStatus.values()) {
            assertEquals('"' + status.name() + '"', mapper.writeValueAsString(status));
            assertEquals(status, mapper.readValue('"' + status.name() + '"', WatchStatus.class));
        }
    }
}
