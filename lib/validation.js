// Input validation utilities

import { isValidPartnerCategory } from './partner-categories.js';

export function validatePartner(payload) {
  const errors = [];
  
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (payload.name && payload.name.length > 200) {
    errors.push('Name must be 200 characters or less');
  }
  
  if (payload.logoUrl && typeof payload.logoUrl !== 'string') {
    errors.push('Logo URL must be a string');
  }
  
  if (payload.logoUrl && payload.logoUrl.length > 500) {
    errors.push('Logo URL must be 500 characters or less');
  }
  
  if (payload.link && typeof payload.link !== 'string') {
    errors.push('Link must be a string');
  }
  
  if (payload.link && payload.link.length > 500) {
    errors.push('Link must be 500 characters or less');
  }
  
  if (payload.link && !isValidUrl(payload.link)) {
    errors.push('Link must be a valid URL');
  }
  
  if (payload.sortOrder !== undefined && (typeof payload.sortOrder !== 'number' || !Number.isInteger(payload.sortOrder))) {
    errors.push('Sort order must be an integer');
  }
  
  if (payload.active !== undefined && typeof payload.active !== 'boolean') {
    errors.push('Active must be a boolean');
  }

  if (payload.category !== undefined && payload.category !== null && !isValidPartnerCategory(payload.category)) {
    errors.push('Category must be one of: hero, exkluzivny, medialny, hlavny');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateNotification(payload) {
  const errors = [];
  
  if (payload.text !== undefined) {
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      errors.push('Text is required and must be a non-empty string');
    }
    if (payload.text.length > 1000) {
      errors.push('Text must be 1000 characters or less');
    }
  }
  
  if (payload.backgroundColor && typeof payload.backgroundColor !== 'string') {
    errors.push('Background color must be a string');
  }
  
  if (payload.backgroundGradient && typeof payload.backgroundGradient !== 'string') {
    errors.push('Background gradient must be a string');
  }
  
  if (payload.borderColor && typeof payload.borderColor !== 'string') {
    errors.push('Border color must be a string');
  }
  
  if (payload.textColor && typeof payload.textColor !== 'string') {
    errors.push('Text color must be a string');
  }
  
  if (payload.active !== undefined && typeof payload.active !== 'boolean') {
    errors.push('Active must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateStatistics(payload) {
  const errors = [];
  
  if (payload.performedInspections !== undefined) {
    if (typeof payload.performedInspections !== 'number' || !Number.isInteger(payload.performedInspections) || payload.performedInspections < 0) {
      errors.push('Performed inspections must be a non-negative integer');
    }
  }
  
  if (payload.yearsExperienceStart !== undefined) {
    if (typeof payload.yearsExperienceStart !== 'number' || !Number.isInteger(payload.yearsExperienceStart)) {
      errors.push('Years experience start must be an integer');
    }
    const currentYear = new Date().getFullYear();
    if (payload.yearsExperienceStart < 1900 || payload.yearsExperienceStart > currentYear) {
      errors.push(`Years experience start must be between 1900 and ${currentYear}`);
    }
  }
  
  if (payload.satisfactionPercentage !== undefined) {
    if (typeof payload.satisfactionPercentage !== 'number' || payload.satisfactionPercentage < 0 || payload.satisfactionPercentage > 100) {
      errors.push('Satisfaction percentage must be a number between 0 and 100');
    }
  }
  
  if (payload.googlePlaceId && typeof payload.googlePlaceId !== 'string') {
    errors.push('Google Place ID must be a string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validatePublicReview(payload) {
  const errors = [];

  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length < 2) {
    errors.push('Meno musí mať aspoň 2 znaky');
  }
  if (payload.name && payload.name.trim().length > 80) {
    errors.push('Meno môže mať najviac 80 znakov');
  }

  if (!payload.text || typeof payload.text !== 'string' || payload.text.trim().length < 8) {
    errors.push('Recenzia musí mať aspoň 8 znakov');
  }
  if (payload.text && payload.text.trim().length > 1200) {
    errors.push('Recenzia môže mať najviac 1200 znakov');
  }

  if (payload.rating !== undefined) {
    if (typeof payload.rating !== 'number' || !Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      errors.push('Hodnotenie musí byť celé číslo 1 až 5');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

const TRACKED_PATH_RE = /^\/[a-z0-9\-./%]*$/i;
const BLOCKED_PATH_PREFIXES = ['/admin', '/api'];

export function validatePageView(payload) {
  const errors = [];
  const path = typeof payload.path === 'string' ? payload.path.trim() : '';

  if (!path || path.length > 300) {
    errors.push('Neplatná cesta stránky');
  } else if (!TRACKED_PATH_RE.test(path)) {
    errors.push('Neplatný formát cesty');
  } else if (BLOCKED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    errors.push('Cesta sa nesleduje');
  }

  if (payload.referrer != null && typeof payload.referrer !== 'string') {
    errors.push('Referrer musí byť text');
  }
  if (payload.referrer && payload.referrer.length > 500) {
    errors.push('Referrer je príliš dlhý');
  }

  return { valid: errors.length === 0, errors };
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function validateBookingSlotsQuery(query = {}) {
  const errors = [];
  const days = Number(query.days);

  if (query.days !== undefined && (!Number.isInteger(days) || days < 1 || days > 31)) {
    errors.push('Parameter days musí byť celé číslo v rozsahu 1-31');
  }

  if (query.serviceType !== undefined) {
    const serviceType = String(query.serviceType).trim().toLowerCase();
    const allowed = ['tk_ek', 'ko'];
    if (!allowed.includes(serviceType)) {
      errors.push('serviceType musí byť tk_ek alebo ko');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateBookingCreate(payload = {}) {
  const errors = [];

  if (!payload.slotId || typeof payload.slotId !== 'string' || payload.slotId.trim().length < 4) {
    errors.push('Vyberte termín rezervácie');
  }

  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length < 2) {
    errors.push('Meno musí mať aspoň 2 znaky');
  }

  if (!payload.phone || typeof payload.phone !== 'string' || payload.phone.trim().length < 6) {
    errors.push('Telefón je povinný');
  }

  if (payload.email !== undefined && payload.email !== null && String(payload.email).trim() !== '') {
    const email = String(payload.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email nemá správny formát');
    }
  }

  if (payload.serviceType !== undefined) {
    const serviceType = String(payload.serviceType).trim().toLowerCase();
    if (!['tk_ek', 'ko'].includes(serviceType)) {
      errors.push('serviceType musí byť tk_ek alebo ko');
    }
  }

  if (payload.note && String(payload.note).length > 1000) {
    errors.push('Poznámka môže mať najviac 1000 znakov');
  }

  if (payload.vehiclePlate && String(payload.vehiclePlate).length > 20) {
    errors.push('EČV môže mať najviac 20 znakov');
  }

  if (payload.vehicleVin && String(payload.vehicleVin).length > 32) {
    errors.push('VIN môže mať najviac 32 znakov');
  }

  return { valid: errors.length === 0, errors };
}
