package com.coffeeduty.member;

import com.coffeeduty.member.MemberDtos.CreateMemberRequest;
import com.coffeeduty.member.MemberDtos.MemberResponse;
import com.coffeeduty.member.MemberDtos.UpdateMemberRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public List<MemberResponse> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return memberService.list(includeInactive);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse create(@Valid @RequestBody CreateMemberRequest request) {
        return memberService.create(request);
    }

    @PatchMapping("/{id}")
    public MemberResponse update(@PathVariable long id, @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.update(id, request);
    }
}
