package com.coffeeduty.purchase;

import com.coffeeduty.common.ApiException;
import com.coffeeduty.member.Member;
import com.coffeeduty.member.MemberRepository;
import com.coffeeduty.purchase.PurchaseDtos.PurchaseRequest;
import com.coffeeduty.purchase.PurchaseDtos.PurchaseResponse;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PurchaseService {

    private final PurchaseRepository purchases;
    private final MemberRepository members;
    private final Clock clock;

    public PurchaseService(PurchaseRepository purchases, MemberRepository members, Clock clock) {
        this.purchases = purchases;
        this.members = members;
        this.clock = clock;
    }

    public List<PurchaseResponse> list() {
        return purchases.findAllByOrderByPurchasedAtDescIdDesc().stream().map(PurchaseResponse::from).toList();
    }

    public PurchaseResponse get(long id) {
        return PurchaseResponse.from(find(id));
    }

    @Transactional
    public PurchaseResponse create(PurchaseRequest request) {
        Resolved resolved = resolve(request, Set.of());
        Purchase purchase = new Purchase(
                resolved.buyer(), resolved.participants(), resolved.purchasedAt(), resolved.memo(), clock.instant());
        return PurchaseResponse.from(purchases.save(purchase));
    }

    @Transactional
    public PurchaseResponse update(long id, PurchaseRequest request) {
        Purchase purchase = find(id);
        Set<Long> alreadyIn = purchase.getParticipants().stream().map(Member::getId).collect(Collectors.toSet());
        Resolved resolved = resolve(request, alreadyIn);
        purchase.change(resolved.buyer(), resolved.participants(), resolved.purchasedAt(), resolved.memo());
        return PurchaseResponse.from(purchase);
    }

    @Transactional
    public void delete(long id) {
        purchases.delete(find(id));
    }

    private Purchase find(long id) {
        return purchases.findWithParticipantsById(id)
                .orElseThrow(() -> ApiException.notFound("purchase " + id + " not found"));
    }

    /**
     * Validates a request against current members.
     *
     * @param grandfathered members already on the purchase being edited; they may stay even if since deactivated
     */
    private Resolved resolve(PurchaseRequest request, Set<Long> grandfathered) {
        Set<Long> ids = new HashSet<>(request.participantIds());
        ids.add(request.buyerId());
        if (ids.size() < 2) {
            throw ApiException.badRequest("a purchase needs at least 2 participants including the buyer");
        }

        Map<Long, Member> found = members.findAllById(ids).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        for (long id : ids) {
            Member member = found.get(id);
            if (member == null) {
                throw ApiException.badRequest("member " + id + " does not exist");
            }
            if (!member.isActive() && !grandfathered.contains(id)) {
                throw ApiException.badRequest("member " + id + " is inactive");
            }
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate purchasedAt = request.purchasedAt() != null ? request.purchasedAt() : today;
        if (purchasedAt.isAfter(today)) {
            throw ApiException.badRequest("purchasedAt must not be in the future");
        }

        String memo = request.memo() == null || request.memo().isBlank() ? null : request.memo().strip();
        return new Resolved(found.get(request.buyerId()), Set.copyOf(found.values()), purchasedAt, memo);
    }

    private record Resolved(Member buyer, Set<Member> participants, LocalDate purchasedAt, String memo) {
    }
}
