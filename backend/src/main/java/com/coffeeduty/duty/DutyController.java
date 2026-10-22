package com.coffeeduty.duty;

import com.coffeeduty.duty.DutyService.DutyResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/duty")
public class DutyController {

    private final DutyService dutyService;

    public DutyController(DutyService dutyService) {
        this.dutyService = dutyService;
    }

    /** {@code ?present=1,2} limits the pick to who is in today; omitted means every active member. */
    @GetMapping
    public DutyResponse duty(@RequestParam(required = false) List<Long> present) {
        return dutyService.duty(present);
    }
}
