package com.tenanthub.backend.controller;

import com.tenanthub.backend.entity.Tenant;
import com.tenanthub.backend.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing tenant management endpoints.
 * Handles HTTP requests, CORS for local frontend ports, and delegates to TenantService.
 */
@RestController
@RequestMapping("/api/tenants")
@CrossOrigin(origins = {
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080"
})
public class TenantController {

    private final TenantService tenantService;

    @Autowired
    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    /**
     * GET /api/tenants — List all tenants, optionally filtered by status.
     * Example: GET /api/tenants or GET /api/tenants?status=Paid
     */
    @GetMapping
    public ResponseEntity<List<Tenant>> getAllTenants(@RequestParam(required = false) String status) {
        List<Tenant> tenants = tenantService.getAllTenants(status);
        return ResponseEntity.ok(tenants);
    }

    /**
     * GET /api/tenants/{id} — Retrieve one tenant by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Tenant> getTenantById(@PathVariable Long id) {
        Tenant tenant = tenantService.getTenantById(id);
        return ResponseEntity.ok(tenant);
    }

    /**
     * POST /api/tenants — Create a new tenant.
     * Returns HTTP 201 Created on success.
     */
    @PostMapping
    public ResponseEntity<Tenant> createTenant(@RequestBody Tenant tenant) {
        Tenant created = tenantService.createTenant(tenant);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/tenants/{id} — Update an existing tenant.
     * Returns HTTP 200 OK on success, or 404 if not found.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Tenant> updateTenant(@PathVariable Long id, @RequestBody Tenant tenant) {
        Tenant updated = tenantService.updateTenant(id, tenant);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/tenants/{id} — Delete a tenant by ID.
     * Returns HTTP 204 No Content on success, or 404 if not found.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTenant(@PathVariable Long id) {
        tenantService.deleteTenant(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/tenants/{id}/status — Update payment status of a tenant.
     * Expected JSON body: { "status": "Paid" }
     * Returns HTTP 200 OK on success, 400 for invalid status, or 404 if not found.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Tenant> updateTenantStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        if (payload == null || !payload.containsKey("status")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Request body must contain a 'status' field (e.g. {\"status\": \"Paid\"}).");
        }
        String newStatus = payload.get("status");
        Tenant updated = tenantService.updateTenantStatus(id, newStatus);
        return ResponseEntity.ok(updated);
    }
}
