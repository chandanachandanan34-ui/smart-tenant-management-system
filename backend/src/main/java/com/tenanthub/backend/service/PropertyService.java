package com.tenanthub.backend.service;

import com.tenanthub.backend.entity.Property;
import com.tenanthub.backend.repository.PropertyRepository;
import com.tenanthub.backend.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Service class handling all business logic, validation,
 * uniqueness constraints, and safe deletion checks for Properties.
 */
@Service
@Transactional
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final TenantRepository tenantRepository;

    @Autowired
    public PropertyService(PropertyRepository propertyRepository, TenantRepository tenantRepository) {
        this.propertyRepository = propertyRepository;
        this.tenantRepository = tenantRepository;
    }

    /**
     * Retrieves all properties ordered by ID ascending.
     *
     * @return list of all properties
     */
    @Transactional(readOnly = true)
    public List<Property> getAllProperties() {
        return propertyRepository.findAll();
    }

    /**
     * Retrieves a single property by ID.
     *
     * @param id the property ID
     * @return the property
     * @throws ResponseStatusException 404 NOT FOUND if property does not exist
     */
    @Transactional(readOnly = true)
    public Property getPropertyById(Long id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found with ID: " + id));
    }

    /**
     * Creates a new property after verifying field constraints and checking
     * that a property with the same name does not already exist.
     *
     * @param property property to persist
     * @return persisted property with generated ID
     */
    public Property createProperty(Property property) {
        validatePropertyPayload(property);

        String trimmedName = property.getName().trim();
        if (propertyRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A property named '" + trimmedName + "' already exists.");
        }

        property.setId(null); // Ensure PostgreSQL auto-generates primary key
        property.setName(trimmedName);
        property.setAddress(property.getAddress().trim());
        property.setPropertyType(property.getPropertyType().trim());
        property.setDescription(property.getDescription() != null ? property.getDescription().trim() : null);

        return propertyRepository.save(property);
    }

    /**
     * Updates an existing property after verifying existence and ensuring the new
     * property name does not collide with another existing property.
     *
     * @param id the property ID to update
     * @param updated updated property data
     * @return the updated property
     */
    public Property updateProperty(Long id, Property updated) {
        Property existing = getPropertyById(id);
        validatePropertyPayload(updated);

        String trimmedName = updated.getName().trim();
        if (propertyRepository.existsByNameIgnoreCaseAndIdNot(trimmedName, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Another property named '" + trimmedName + "' already exists.");
        }

        existing.setName(trimmedName);
        existing.setAddress(updated.getAddress().trim());
        existing.setPropertyType(updated.getPropertyType().trim());
        existing.setTotalUnits(updated.getTotalUnits());
        existing.setDescription(updated.getDescription() != null ? updated.getDescription().trim() : null);

        return propertyRepository.save(existing);
    }

    /**
     * Deletes a property safely.
     * Integrity safeguard: Prevents deletion if any tenants are currently assigned
     * to this property to avoid orphaned tenant records or accidental data loss.
     *
     * @param id property ID to delete
     * @throws ResponseStatusException 404 if not found, 409 CONFLICT if tenants are assigned
     */
    public void deleteProperty(Long id) {
        Property property = getPropertyById(id);

        long assignedTenants = tenantRepository.countByPropertyIgnoreCase(property.getName().trim());
        if (assignedTenants > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete property '" + property.getName() + "' because " + assignedTenants +
                    " tenant(s) are currently assigned to it. Please reassign or remove all tenants first.");
        }

        propertyRepository.deleteById(id);
    }

    /**
     * Validates required property fields.
     */
    private void validatePropertyPayload(Property property) {
        if (property == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property payload cannot be null.");
        }
        if (property.getName() == null || property.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property name is required.");
        }
        if (property.getAddress() == null || property.getAddress().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property address is required.");
        }
        if (property.getPropertyType() == null || property.getPropertyType().trim().isEmpty()) {
            property.setPropertyType("Residential"); // Sensible default
        }
        if (property.getTotalUnits() == null || property.getTotalUnits() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total units must be a positive integer greater than zero.");
        }
    }
}
