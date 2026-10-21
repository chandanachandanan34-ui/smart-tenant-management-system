package com.tenanthub.backend.service;

import com.tenanthub.backend.entity.Tenant;
import com.tenanthub.backend.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

/**
 * Service class handling all business logic, validation,
 * and database interactions for Tenants.
 */
@Service
@Transactional
public class TenantService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("PAID", "PENDING", "OVERDUE");

    private final TenantRepository tenantRepository;

    @Autowired
    public TenantService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    /**
     * Retrieves all tenants, optionally filtered by status.
     *
     * @param status optional status filter (e.g., "Paid", "Pending", "Overdue")
     * @return list of tenants
     */
    @Transactional(readOnly = true)
    public List<Tenant> getAllTenants(String status) {
        if (status != null && !status.trim().isEmpty()) {
            return tenantRepository.findByStatusIgnoreCase(status.trim());
        }
        return tenantRepository.findAll();
    }

    /**
     * Retrieves a single tenant by their ID.
     *
     * @param id the tenant primary key
     * @return the found tenant
     * @throws ResponseStatusException 404 NOT FOUND if tenant does not exist
     */
    @Transactional(readOnly = true)
    public Tenant getTenantById(Long id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found with ID: " + id));
    }

    /**
     * Creates a new tenant after validating all required fields and checking
     * that the unit in the specified property is not already occupied.
     *
     * @param tenant the tenant details to persist
     * @return the persisted tenant with generated ID
     */
    public Tenant createTenant(Tenant tenant) {
        validateTenantPayload(tenant);

        String property = tenant.getProperty().trim();
        String unit = tenant.getUnit().trim();

        // Check property/unit conflict
        if (tenantRepository.existsByPropertyAndUnitIgnoreCase(property, unit)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A tenant record already uses unit '" + unit + "' in '" + property + "'.");
        }

        // Clean & format data before saving
        tenant.setId(null); // Ensure database auto-generates the primary key
        tenant.setName(tenant.getName().trim());
        tenant.setEmail(tenant.getEmail() != null ? tenant.getEmail().trim() : null);
        tenant.setPhone(tenant.getPhone().trim());
        tenant.setProperty(property);
        tenant.setUnit(unit);
        tenant.setStatus(normalizeStatus(tenant.getStatus()));

        return tenantRepository.save(tenant);
    }

    /**
     * Updates an existing tenant after verifying existence, field validations,
     * and ensuring the unit is not occupied by another tenant.
     *
     * @param id the ID of the tenant to update
     * @param updated the updated tenant details
     * @return the updated tenant
     */
    public Tenant updateTenant(Long id, Tenant updated) {
        Tenant existing = getTenantById(id);
        validateTenantPayload(updated);

        String property = updated.getProperty().trim();
        String unit = updated.getUnit().trim();

        // Check if another tenant (different ID) occupies this property + unit
        if (tenantRepository.existsByPropertyAndUnitIgnoreCaseAndIdNot(property, unit, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A tenant record already uses unit '" + unit + "' in '" + property + "'.");
        }

        existing.setName(updated.getName().trim());
        existing.setEmail(updated.getEmail() != null ? updated.getEmail().trim() : null);
        existing.setPhone(updated.getPhone().trim());
        existing.setProperty(property);
        existing.setUnit(unit);
        existing.setRent(updated.getRent());
        existing.setStatus(normalizeStatus(updated.getStatus()));

        return tenantRepository.save(existing);
    }

    /**
     * Deletes a tenant by their ID.
     *
     * @param id the tenant ID to delete
     * @throws ResponseStatusException 404 NOT FOUND if tenant does not exist
     */
    public void deleteTenant(Long id) {
        if (!tenantRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found with ID: " + id);
        }
        tenantRepository.deleteById(id);
    }

    /**
     * Updates only the payment status of a tenant.
     *
     * @param id the tenant ID
     * @param newStatus the new status ("Paid", "Pending", "Overdue")
     * @return the updated tenant
     */
    public Tenant updateTenantStatus(Long id, String newStatus) {
        Tenant tenant = getTenantById(id);
        tenant.setStatus(normalizeStatus(newStatus));
        return tenantRepository.save(tenant);
    }

    /**
     * Validates that all required fields are provided and non-empty.
     */
    private void validateTenantPayload(Tenant tenant) {
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tenant payload cannot be null.");
        }
        if (tenant.getName() == null || tenant.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required.");
        }
        if (tenant.getPhone() == null || tenant.getPhone().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required.");
        }
        if (tenant.getProperty() == null || tenant.getProperty().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property name is required.");
        }
        if (tenant.getUnit() == null || tenant.getUnit().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unit / room identifier is required.");
        }
        if (tenant.getRent() == null || tenant.getRent() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Monthly rent must be a positive number.");
        }
        if (tenant.getStatus() == null || tenant.getStatus().trim().isEmpty()) {
            tenant.setStatus("Pending"); // Default fallback if omitted
        }
    }

    /**
     * Normalizes and validates the status string to standard capitalized format:
     * "Paid", "Pending", or "Overdue".
     */
    private String normalizeStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment status is required.");
        }
        String upper = status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid payment status '" + status + "'. Allowed values are: Paid, Pending, Overdue.");
        }
        return upper.charAt(0) + upper.substring(1).toLowerCase();
    }
}
