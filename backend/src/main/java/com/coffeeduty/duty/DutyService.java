package com.coffeeduty.duty;

import com.coffeeduty.common.ApiException;
import com.coffeeduty.member.Member;
import com.coffeeduty.member.MemberDtos.MemberRef;
import com.coffeeduty.member.MemberRepository;
import com.coffeeduty.purchase.Purchase;
import com.coffeeduty.purchase.PurchaseRepository;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DutyService {

    private final MemberRepository members;
    private final PurchaseRepository purchases;

    public DutyService(MemberRepository members, PurchaseRepository purchases) {
        this.members = members;
        this.purchases = purchases;
    }

    /**
     * @param presentIds who is in today; null means every active member
     */
    public DutyResponse duty(List<Long> presentIds) {
        Map<Long, Member> allMembers = members.findAllByOrderByIdAsc().stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        List<PurchaseRecord> records = purchases.findAllByOrderByPurchasedAtDescIdDesc().stream()
                .map(Purchase::toRecord)
                .toList();
        Map<Long, MemberStanding> standings = DutyCalculator.standings(allMembers.keySet(), records);

        Set<Long> present = presentIds == null
                ? allMembers.values().stream().filter(Member::isActive).map(Member::getId)
                        .collect(Collectors.toCollection(LinkedHashSet::new))
                : validatePresent(presentIds, allMembers);

        MemberRef nextDuty = DutyCalculator.nextDuty(present, standings)
                .map(id -> MemberRef.from(allMembers.get(id)))
                .orElse(null);

        List<StandingResponse> standingResponses = standings.values().stream()
                .map(s -> StandingResponse.of(allMembers.get(s.memberId()), s))
                .toList();
        return new DutyResponse(nextDuty, List.copyOf(present), standingResponses);
    }

    private static Set<Long> validatePresent(List<Long> presentIds, Map<Long, Member> allMembers) {
        Set<Long> present = new LinkedHashSet<>();
        for (Long id : presentIds) {
            Member member = allMembers.get(id);
            if (member == null) {
                throw ApiException.badRequest("member " + id + " does not exist");
            }
            if (!member.isActive()) {
                throw ApiException.badRequest("member " + id + " is inactive");
            }
            present.add(id);
        }
        return present;
    }

    /**
     * @param nextDuty null when fewer than two members are present
     */
    public record DutyResponse(MemberRef nextDuty, List<Long> presentMemberIds, List<StandingResponse> standings) {
    }

    public record StandingResponse(
            long memberId,
            String name,
            boolean active,
            int balance,
            int cupsGiven,
            int cupsReceived,
            int purchaseCount,
            LocalDate lastPurchasedAt) {

        static StandingResponse of(Member member, MemberStanding standing) {
            return new StandingResponse(
                    member.getId(),
                    member.getName(),
                    member.isActive(),
                    standing.balance(),
                    standing.cupsGiven(),
                    standing.cupsReceived(),
                    standing.purchaseCount(),
                    standing.lastPurchasedAt());
        }
    }
}
