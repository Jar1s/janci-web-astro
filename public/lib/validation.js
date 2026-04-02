// Input validation utilities

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

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

