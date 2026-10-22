package com.coffeeduty.purchase;

import com.coffeeduty.purchase.PurchaseDtos.PurchaseRequest;
import com.coffeeduty.purchase.PurchaseDtos.PurchaseResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public List<PurchaseResponse> list() {
        return purchaseService.list();
    }

    @GetMapping("/{id}")
    public PurchaseResponse get(@PathVariable long id) {
        return purchaseService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseResponse create(@Valid @RequestBody PurchaseRequest request) {
        return purchaseService.create(request);
    }

    @PutMapping("/{id}")
    public PurchaseResponse update(@PathVariable long id, @Valid @RequestBody PurchaseRequest request) {
        return purchaseService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        purchaseService.delete(id);
    }
}
