package com.coffeeduty.api;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import(ApiIntegrationTest.FixedClock.class)
class ApiIntegrationTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    /** 2026-10-22 00:30 in Seoul, which is still 2026-10-21 in UTC. */
    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(Instant.parse("2026-10-21T15:30:00Z"), SEOUL);
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    long a;
    long b;
    long c;

    @BeforeEach
    void resetDatabase() throws Exception {
        jdbc.update("delete from purchase_participants");
        jdbc.update("delete from purchases");
        jdbc.update("delete from members");
        a = createMember("철수");
        b = createMember("영희");
        c = createMember("민수");
    }

    @Nested
    class Members {

        @Test
        void listsActiveMembersInCreationOrder() throws Exception {
            mvc.perform(get("/api/members"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[*].name", contains("철수", "영희", "민수")))
                    .andExpect(jsonPath("$[0].active").value(true));
        }

        @Test
        void trimsNameAndRejectsDuplicates() throws Exception {
            postJson("/api/members", """
                    {"name": "  지수  "}""")
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("지수"));

            postJson("/api/members", """
                    {"name": "지수"}""")
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.detail", containsString("already exists")));
        }

        @Test
        void rejectsBlankName() throws Exception {
            postJson("/api/members", """
                    {"name": "   "}""")
                    .andExpect(status().isBadRequest());
        }

        @Test
        void deactivatedMemberIsHiddenByDefaultButListedOnRequest() throws Exception {
            patchJson("/api/members/" + c, """
                    {"active": false}""")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.active").value(false));

            mvc.perform(get("/api/members")).andExpect(jsonPath("$", hasSize(2)));
            mvc.perform(get("/api/members?includeInactive=true")).andExpect(jsonPath("$", hasSize(3)));
        }

        @Test
        void renameToExistingNameIsRejected() throws Exception {
            patchJson("/api/members/" + a, """
                    {"name": "영희"}""")
                    .andExpect(status().isConflict());
        }

        @Test
        void updatingUnknownMemberIsNotFound() throws Exception {
            patchJson("/api/members/9999", """
                    {"active": false}""")
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    class Purchases {

        @Test
        void buyerIsAddedToParticipantsAndDateDefaultsToTodayInSeoul() throws Exception {
            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": [%d, %d], "memo": " 아아 3잔 "}""".formatted(a, b, c))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.buyer.id").value(a))
                    .andExpect(jsonPath("$.participants[*].id", contains((int) a, (int) b, (int) c)))
                    .andExpect(jsonPath("$.cups").value(3))
                    .andExpect(jsonPath("$.purchasedAt").value("2026-10-22"))
                    .andExpect(jsonPath("$.memo").value("아아 3잔"));
        }

        @Test
        void listsNewestFirstByPurchaseDate() throws Exception {
            buy(a, "2026-10-20", b, c);
            buy(b, "2026-10-21", a, c);
            buy(c, "2026-10-19", a, b);

            mvc.perform(get("/api/purchases"))
                    .andExpect(jsonPath("$[*].buyer.name", contains("영희", "철수", "민수")));
        }

        @Test
        void rejectsPurchaseWithOnlyTheBuyer() throws Exception {
            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": [%d]}""".formatted(a, a))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("at least 2")));
        }

        @Test
        void rejectsMissingBuyerOrParticipants() throws Exception {
            postJson("/api/purchases", """
                    {"participantIds": [%d, %d]}""".formatted(a, b))
                    .andExpect(status().isBadRequest());
            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": []}""".formatted(a))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void rejectsUnknownMember() throws Exception {
            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": [9999]}""".formatted(a))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("9999")));
        }

        @Test
        void rejectsInactiveMemberOnNewPurchase() throws Exception {
            patchJson("/api/members/" + c, """
                    {"active": false}""");

            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": [%d]}""".formatted(a, c))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("inactive")));
        }

        @Test
        void inactiveMemberMayStayOnAnExistingPurchaseWhenEdited() throws Exception {
            long id = buy(a, "2026-10-20", b, c);
            patchJson("/api/members/" + c, """
                    {"active": false}""");

            putJson("/api/purchases/" + id, """
                    {"buyerId": %d, "participantIds": [%d, %d], "purchasedAt": "2026-10-19"}""".formatted(a, b, c))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.purchasedAt").value("2026-10-19"));
        }

        @Test
        void rejectsFutureDate() throws Exception {
            postJson("/api/purchases", """
                    {"buyerId": %d, "participantIds": [%d], "purchasedAt": "2026-10-23"}""".formatted(a, b))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("future")));
        }

        @Test
        void unknownPurchaseIsNotFound() throws Exception {
            mvc.perform(get("/api/purchases/9999")).andExpect(status().isNotFound());
            mvc.perform(delete("/api/purchases/9999")).andExpect(status().isNotFound());
            putJson("/api/purchases/9999", """
                    {"buyerId": %d, "participantIds": [%d]}""".formatted(a, b))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    class Duty {

        @Test
        void withNoHistoryFirstMemberIsOnDutyAndEveryoneIsEven() throws Exception {
            mvc.perform(get("/api/duty"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nextDuty.id").value(a))
                    .andExpect(jsonPath("$.presentMemberIds", contains((int) a, (int) b, (int) c)))
                    .andExpect(jsonPath("$.standings[*].balance", contains(0, 0, 0)));
        }

        @Test
        void absentDutyMemberScenarioEndToEnd() throws Exception {
            buy(a, "2026-10-15", b, c);
            buy(b, "2026-10-16", a, c);
            expectDuty("", c);
            buy(c, "2026-10-17", a, b);

            // 민수 is away: 철수 bought least recently among the two who are in
            expectDuty("?present=%d,%d".formatted(a, b), a);
            buy(a, "2026-10-20", b);
            expectBalances(1, -1, 0);

            expectDuty("", b);
            buy(b, "2026-10-21", a, c);
            expectBalances(0, 1, -1);

            expectDuty("", c);
        }

        @Test
        void standingsExplainTheBalance() throws Exception {
            buy(a, "2026-10-20", b, c);
            buy(b, "2026-10-21", a);

            mvc.perform(get("/api/duty"))
                    .andExpect(jsonPath("$.standings[0].cupsGiven").value(2))
                    .andExpect(jsonPath("$.standings[0].cupsReceived").value(1))
                    .andExpect(jsonPath("$.standings[0].balance").value(1))
                    .andExpect(jsonPath("$.standings[0].purchaseCount").value(1))
                    .andExpect(jsonPath("$.standings[0].lastPurchasedAt").value("2026-10-20"))
                    .andExpect(jsonPath("$.standings[2].lastPurchasedAt").value(nullValue()));
        }

        @Test
        void deletingAPurchaseRestoresTheDuty() throws Exception {
            buy(a, "2026-10-20", b, c);
            expectDuty("", b);
            long mistake = buy(b, "2026-10-21", a, c);
            expectDuty("", c);

            mvc.perform(delete("/api/purchases/" + mistake)).andExpect(status().isNoContent());

            expectDuty("", b);
            expectBalances(2, -1, -1);
        }

        @Test
        void editingWhoBoughtMovesTheDuty() throws Exception {
            long id = buy(a, "2026-10-20", b, c);
            expectDuty("", b);

            putJson("/api/purchases/" + id, """
                    {"buyerId": %d, "participantIds": [%d, %d], "purchasedAt": "2026-10-20"}""".formatted(b, a, c))
                    .andExpect(status().isOk());

            expectBalances(-1, 2, -1);
            expectDuty("", a);
        }

        @Test
        void deactivatedMemberIsLeftOutOfTheDefaultAttendance() throws Exception {
            patchJson("/api/members/" + a, """
                    {"active": false}""");

            mvc.perform(get("/api/duty"))
                    .andExpect(jsonPath("$.nextDuty.id").value(b))
                    .andExpect(jsonPath("$.presentMemberIds", contains((int) b, (int) c)))
                    .andExpect(jsonPath("$.standings", hasSize(3)))
                    .andExpect(jsonPath("$.standings[0].active").value(false));
        }

        @Test
        void singlePresentMemberMeansNoDuty() throws Exception {
            mvc.perform(get("/api/duty?present=" + a))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nextDuty").value(nullValue()));
        }

        @Test
        void emptyAttendanceMeansNobodyIsInNotEveryone() throws Exception {
            mvc.perform(get("/api/duty?present="))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nextDuty").value(nullValue()))
                    .andExpect(jsonPath("$.presentMemberIds", hasSize(0)))
                    .andExpect(jsonPath("$.standings", hasSize(3)));
        }

        @Test
        void unknownOrInactivePresentMemberIsRejected() throws Exception {
            mvc.perform(get("/api/duty?present=%d,9999".formatted(a)))
                    .andExpect(status().isBadRequest());

            patchJson("/api/members/" + c, """
                    {"active": false}""");
            mvc.perform(get("/api/duty?present=%d,%d".formatted(a, c)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("inactive")));
        }
    }

    @Test
    void exposesHealthForThePlatformCheck() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void allowsTheFrontendOrigin() throws Exception {
        mvc.perform(get("/api/members").header("Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        mvc.perform(get("/api/members").header("Origin", "http://evil.example"))
                .andExpect(status().isForbidden());
    }

    private long createMember(String name) throws Exception {
        String body = postJson("/api/members", """
                {"name": "%s"}""".formatted(name))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private long buy(long buyer, String date, long... others) throws Exception {
        String ids = java.util.Arrays.stream(others).mapToObj(Long::toString)
                .collect(java.util.stream.Collectors.joining(","));
        String body = postJson("/api/purchases", """
                {"buyerId": %d, "participantIds": [%s], "purchasedAt": "%s"}""".formatted(buyer, ids, date))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private void expectDuty(String query, long expected) throws Exception {
        mvc.perform(get("/api/duty" + query))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextDuty.id").value(expected));
    }

    private void expectBalances(int... balances) throws Exception {
        mvc.perform(get("/api/duty"))
                .andExpect(jsonPath("$.standings[*].balance",
                        contains(java.util.Arrays.stream(balances).boxed().toArray())));
    }

    private ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions putJson(String url, String json) throws Exception {
        return mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions patchJson(String url, String json) throws Exception {
        return mvc.perform(patch(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
