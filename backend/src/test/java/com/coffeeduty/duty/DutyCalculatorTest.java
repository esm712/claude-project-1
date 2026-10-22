package com.coffeeduty.duty;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DutyCalculatorTest {

    private static final long A = 1;
    private static final long B = 2;
    private static final long C = 3;
    private static final List<Long> ABC = List.of(A, B, C);
    private static final LocalDate DAY1 = LocalDate.of(2026, 10, 1);

    /** Builds a purchase history in order, one day per purchase unless a date is given. */
    private static final class Ledger {
        private final List<PurchaseRecord> purchases = new ArrayList<>();
        private long nextId = 1;
        private LocalDate nextDate = DAY1;

        Ledger buy(long buyer, Long... participants) {
            return buyOn(nextDate, buyer, participants);
        }

        Ledger buyOn(LocalDate date, long buyer, Long... participants) {
            Set<Long> ids = new HashSet<>(List.of(participants));
            ids.add(buyer);
            purchases.add(new PurchaseRecord(nextId++, buyer, ids, date));
            nextDate = date.plusDays(1);
            return this;
        }

        Map<Long, MemberStanding> standings() {
            return DutyCalculator.standings(ABC, purchases);
        }

        long next(Long... present) {
            return DutyCalculator.nextDuty(List.of(present), standings()).orElseThrow();
        }

        int balance(long member) {
            return standings().get(member).balance();
        }

        List<Integer> balances() {
            return ABC.stream().map(this::balance).toList();
        }
    }

    @Nested
    @DisplayName("balances")
    class Balances {

        @Test
        void startAtZeroWithNoPurchases() {
            assertThat(new Ledger().balances()).containsExactly(0, 0, 0);
        }

        @Test
        void buyerOfThreeCupsGivesTwoAndOthersReceiveOne() {
            Ledger ledger = new Ledger().buy(A, B, C);

            MemberStanding a = ledger.standings().get(A);
            assertThat(a.cupsGiven()).isEqualTo(2);
            assertThat(a.cupsReceived()).isZero();
            assertThat(a.purchaseCount()).isEqualTo(1);
            assertThat(ledger.balances()).containsExactly(2, -1, -1);
        }

        @Test
        void twoCupRunLeavesTheAbsentMemberUntouched() {
            Ledger ledger = new Ledger().buy(A, B);

            assertThat(ledger.balances()).containsExactly(1, -1, 0);
            MemberStanding c = ledger.standings().get(C);
            assertThat(c.cupsGiven()).isZero();
            assertThat(c.cupsReceived()).isZero();
        }

        @Test
        void absentMemberBalanceDoesNotMoveDuringLongAbsence() {
            Ledger ledger = new Ledger().buy(A, B, C).buy(B, A, C).buy(C, A, B);
            int before = ledger.balance(C);

            for (int i = 0; i < 10; i++) {
                ledger.buy(ledger.next(A, B), A, B);
            }

            assertThat(ledger.balance(C)).isEqualTo(before);
        }

        @Test
        void everyoneBuyingOneFullRoundCancelsOut() {
            assertThat(new Ledger().buy(A, B, C).buy(B, A, C).buy(C, A, B).balances())
                    .containsExactly(0, 0, 0);
        }

        @Test
        void removingAPurchaseRestoresPreviousBalances() {
            Ledger before = new Ledger().buy(A, B, C).buy(B, A);
            Ledger withExtra = new Ledger().buy(A, B, C).buy(B, A).buy(C, A, B);

            List<PurchaseRecord> withoutLast = withExtra.purchases.subList(0, 2);

            assertThat(DutyCalculator.standings(ABC, withoutLast)).isEqualTo(before.standings());
        }

        @Test
        void memberWithoutHistoryStillGetsAStanding() {
            Map<Long, MemberStanding> standings = DutyCalculator.standings(List.of(A, B, C, 4L), List.of());

            assertThat(standings).containsOnlyKeys(A, B, C, 4L);
            assertThat(standings.get(4L).lastPurchasedAt()).isNull();
        }
    }

    @Nested
    @DisplayName("next duty")
    class NextDuty {

        @Test
        void withNoHistoryLowestMemberIdGoesFirst() {
            assertThat(new Ledger().next(A, B, C)).isEqualTo(A);
            assertThat(new Ledger().next(C, B)).isEqualTo(B);
        }

        @Test
        void fullAttendanceRotatesInOrder() {
            Ledger ledger = new Ledger();
            List<Long> order = new ArrayList<>();

            for (int i = 0; i < 9; i++) {
                long duty = ledger.next(A, B, C);
                order.add(duty);
                ledger.buy(duty, A, B, C);
            }

            assertThat(order).containsExactly(A, B, C, A, B, C, A, B, C);
        }

        @Test
        void afterAFullRoundTheLeastRecentBuyerIsNext() {
            Ledger ledger = new Ledger().buy(B, A, C).buy(C, A, B).buy(A, B, C);

            assertThat(ledger.next(A, B, C)).isEqualTo(B);
        }

        @Test
        @DisplayName("C on duty but absent: A and B share a 2-cup run, then B owes one, then C")
        void absentDutyMemberScenario() {
            Ledger ledger = new Ledger().buy(A, B, C).buy(B, A, C);
            assertThat(ledger.next(A, B, C)).isEqualTo(C);
            ledger.buy(C, A, B);
            assertThat(ledger.balances()).containsExactly(0, 0, 0);

            // C is away: duty falls to the least recent buyer among A and B
            assertThat(ledger.next(A, B)).isEqualTo(A);
            ledger.buy(A, B);
            assertThat(ledger.balances()).containsExactly(1, -1, 0);

            // B drank one more cup than they paid for, so B buys before C
            assertThat(ledger.next(A, B, C)).isEqualTo(B);
            ledger.buy(B, A, C);
            assertThat(ledger.balances()).containsExactly(0, 1, -1);

            assertThat(ledger.next(A, B, C)).isEqualTo(C);
        }

        @Test
        void absentMemberIsNeverChosenEvenWithLowestBalance() {
            Ledger ledger = new Ledger().buy(A, B, C);
            assertThat(ledger.balances()).containsExactly(2, -1, -1);

            assertThat(ledger.next(A, C)).isEqualTo(C);
            assertThat(ledger.next(A, B)).isEqualTo(B);
        }

        @Test
        void coveringForTheDutyMemberKeepsThemOnDuty() {
            Ledger ledger = new Ledger();
            assertThat(ledger.next(A, B, C)).isEqualTo(A);

            ledger.buy(B, A, C);

            assertThat(ledger.next(A, B, C)).isEqualTo(A);
        }

        @Test
        void sameDayTieIsBrokenByPurchaseOrder() {
            Ledger ledger = new Ledger()
                    .buyOn(DAY1, B, A, C)
                    .buyOn(DAY1, A, B, C)
                    .buyOn(DAY1, C, A, B);

            assertThat(ledger.balances()).containsExactly(0, 0, 0);
            assertThat(ledger.next(A, B, C)).isEqualTo(B);
        }

        @Test
        void tieIsBrokenByPurchaseDateNotInsertionOrder() {
            Ledger ledger = new Ledger()
                    .buyOn(DAY1.plusDays(5), A, B, C)
                    .buyOn(DAY1, B, A, C)
                    .buyOn(DAY1.plusDays(2), C, A, B);

            assertThat(ledger.next(A, B, C)).isEqualTo(B);
        }

        @Test
        void neverBoughtBeatsBoughtLongAgoOnTie() {
            Ledger ledger = new Ledger().buy(A, B).buy(B, A);

            assertThat(ledger.balances()).containsExactly(0, 0, 0);
            assertThat(ledger.next(A, B, C)).isEqualTo(C);
        }

        @Test
        void fewerThanTwoPresentMeansNobodyIsOnDuty() {
            Map<Long, MemberStanding> standings = new Ledger().standings();

            assertThat(DutyCalculator.nextDuty(List.of(A), standings)).isEmpty();
            assertThat(DutyCalculator.nextDuty(List.of(), standings)).isEmpty();
            assertThat(DutyCalculator.nextDuty(List.of(A, A), standings)).isEmpty();
        }
    }

    @Nested
    @DisplayName("invariants under random attendance")
    class Invariants {

        @ParameterizedTest
        @ValueSource(longs = {1, 7, 42, 2026, 31337})
        void balancesAlwaysSumToZeroEvenWhenSomeoneCovers(long seed) {
            Random random = new Random(seed);
            Ledger ledger = new Ledger();

            for (int i = 0; i < 300; i++) {
                List<Long> present = randomAttendance(random);
                long buyer = present.get(random.nextInt(present.size()));
                ledger.buy(buyer, present.toArray(Long[]::new));

                assertThat(ledger.balances().stream().mapToInt(Integer::intValue).sum()).isZero();
            }
        }

        @ParameterizedTest
        @ValueSource(longs = {1, 7, 42, 2026, 31337})
        void followingTheDutyKeepsEveryoneWithinOneRoundOfEven(long seed) {
            Random random = new Random(seed);
            Ledger ledger = new Ledger();

            for (int i = 0; i < 300; i++) {
                List<Long> present = randomAttendance(random);
                long duty = ledger.next(present.toArray(Long[]::new));
                assertThat(present).contains(duty);
                ledger.buy(duty, present.toArray(Long[]::new));

                // nobody gets more than a full round ahead of or behind the group
                assertThat(ledger.balances()).allSatisfy(b -> assertThat(Math.abs(b)).isLessThanOrEqualTo(ABC.size() - 1));
            }
        }

        private List<Long> randomAttendance(Random random) {
            List<Long> present = new ArrayList<>();
            while (present.size() < 2) {
                present.clear();
                for (long id : ABC) {
                    if (random.nextInt(4) != 0) {
                        present.add(id);
                    }
                }
            }
            return present;
        }
    }

    @Nested
    @DisplayName("input validation")
    class Validation {

        @Test
        void purchaseMustIncludeBuyerAsParticipant() {
            assertThatThrownBy(() -> new PurchaseRecord(1, A, Set.of(B, C), DAY1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("buyer must be a participant");
        }

        @Test
        void purchaseNeedsAtLeastTwoParticipants() {
            assertThatThrownBy(() -> new PurchaseRecord(1, A, Set.of(A), DAY1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("at least 2");
        }

        @Test
        void purchaseReferencingUnknownMemberIsRejected() {
            List<PurchaseRecord> purchases = List.of(new PurchaseRecord(1, A, Set.of(A, 99L), DAY1));

            assertThatThrownBy(() -> DutyCalculator.standings(ABC, purchases))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("unknown member 99");
        }

        @Test
        void presentMemberWithoutStandingIsRejected() {
            Map<Long, MemberStanding> standings = new Ledger().standings();

            assertThatThrownBy(() -> DutyCalculator.nextDuty(List.of(A, 99L), standings))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("member 99");
        }
    }
}
