package com.coffeeduty.member;

import com.coffeeduty.common.ApiException;
import com.coffeeduty.member.MemberDtos.CreateMemberRequest;
import com.coffeeduty.member.MemberDtos.MemberResponse;
import com.coffeeduty.member.MemberDtos.UpdateMemberRequest;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository members;
    private final Clock clock;

    public MemberService(MemberRepository members, Clock clock) {
        this.members = members;
        this.clock = clock;
    }

    public List<MemberResponse> list(boolean includeInactive) {
        List<Member> found = includeInactive
                ? members.findAllByOrderByIdAsc()
                : members.findAllByActiveTrueOrderByIdAsc();
        return found.stream().map(MemberResponse::from).toList();
    }

    @Transactional
    public MemberResponse create(CreateMemberRequest request) {
        String name = request.name().strip();
        requireUniqueName(name);
        return MemberResponse.from(members.save(new Member(name, clock.instant())));
    }

    @Transactional
    public MemberResponse update(long id, UpdateMemberRequest request) {
        Member member = members.findById(id)
                .orElseThrow(() -> ApiException.notFound("member " + id + " not found"));
        if (request.name() != null) {
            String name = request.name().strip();
            if (name.isEmpty()) {
                throw ApiException.badRequest("name must not be blank");
            }
            if (!name.equals(member.getName())) {
                requireUniqueName(name);
                member.rename(name);
            }
        }
        if (request.active() != null) {
            member.setActive(request.active());
        }
        return MemberResponse.from(member);
    }

    private void requireUniqueName(String name) {
        if (members.existsByName(name)) {
            throw ApiException.conflict("member name already exists: " + name);
        }
    }
}
