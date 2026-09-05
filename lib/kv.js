import {
  hasSupabase,
  hasServiceRole,
  restDelete,
  restInsert,
  restSelect,
  restSelectOne,
  restUpdate,
  restUpsert
} from './supabase.js';

const NOTIFICATIONS_TABLE = 'notifications';
const STATISTICS_TABLE = 'statistics';
const PARTNERS_TABLE = 'partners';
const REVIEWS_TABLE = 'reviews';

const defaultNotifications = [];
const defaultStatistics = {
  performedInspections: 15000,
  yearsExperienceStart: 2014,
  satisfactionPercentage: 98,
  googlePlaceId: null
};

export async function getNotifications(activeOnly = true) {
  if (!hasSupabase()) {
    return { notifications: defaultNotifications };
  }

  try {
    const { data, error } = await restSelect(NOTIFICATIONS_TABLE, {
      order: [{ column: 'created_at', ascending: false }],
      ...(activeOnly ? { eqBool: { active: true } } : {})
    });

    if (error) {
      console.error('Error reading notifications:', error);
      return { notifications: defaultNotifications };
    }

    const notifications = (data || []).map((item) => ({
      id: item.id?.toString(),
      text: item.text,
      backgroundColor: item.background_color,
      backgroundGradient: item.background_gradient,
      borderColor: item.border_color,
      textColor: item.text_color,
      active: item.active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    return { notifications };
  } catch (error) {
    console.error('Unexpected error reading notifications:', error);
    return { notifications: defaultNotifications };
  }
}

export async function upsertNotification(payload) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const now = new Date().toISOString();
  const notificationData = {
    text: payload.text,
    background_color: payload.backgroundColor,
    background_gradient: payload.backgroundGradient,
    border_color: payload.borderColor,
    text_color: payload.textColor,
    active: payload.active ?? true,
    updated_at: now
  };

  let error;
  if (payload.id) {
    ({ error } = await restUpdate(NOTIFICATIONS_TABLE, notificationData, { id: payload.id }));
  } else {
    notificationData.created_at = now;
    ({ error } = await restInsert(NOTIFICATIONS_TABLE, notificationData));
  }

  if (error) {
    console.error('Error saving notification:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }

  return { ok: true };
}

export async function updateNotification(id, changes) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const mapChange = {};
  if (changes.text !== undefined) mapChange.text = changes.text;
  if (changes.backgroundColor !== undefined) mapChange.background_color = changes.backgroundColor;
  if (changes.backgroundGradient !== undefined) mapChange.background_gradient = changes.backgroundGradient;
  if (changes.borderColor !== undefined) mapChange.border_color = changes.borderColor;
  if (changes.textColor !== undefined) mapChange.text_color = changes.textColor;
  if (changes.active !== undefined) mapChange.active = changes.active;

  const updateData = { ...mapChange, updated_at: new Date().toISOString() };

  const { error } = await restUpdate(NOTIFICATIONS_TABLE, updateData, { id });
  if (error) {
    console.error('Error updating notification:', error);
    return { ok: false, reason: 'db-error' };
  }
  return { ok: true };
}

export async function deleteNotification(id) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }
  const { error } = await restDelete(NOTIFICATIONS_TABLE, { id });
  if (error) {
    console.error('Error deleting notification:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

export async function getPartners(activeOnly = true) {
  if (!hasSupabase()) return { partners: [] };
  try {
    const { data, error } = await restSelect(PARTNERS_TABLE, {
      order: [
        { column: 'sort_order', ascending: true },
        { column: 'created_at', ascending: true }
      ],
      ...(activeOnly ? { eqBool: { active: true } } : {})
    });
    if (error) {
      console.error('Error reading partners:', error);
      return { partners: [] };
    }
    const partners = (data || []).map((item) => ({
      id: item.id?.toString(),
      name: item.name,
      logoUrl: item.logo_url,
      link: item.link,
      sortOrder: item.sort_order ?? 0,
      active: item.active,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    return { partners };
  } catch (err) {
    console.error('Unexpected error reading partners:', err);
    return { partners: [] };
  }
}

export async function upsertPartner(payload) {
  if (!hasSupabase() || !hasServiceRole()) return { ok: false, reason: 'missing-service-role' };
  const now = new Date().toISOString();
  const row = {
    name: payload.name,
    logo_url: payload.logoUrl,
    link: payload.link,
    sort_order: payload.sortOrder ?? 0,
    active: payload.active ?? true,
    updated_at: now
  };
  let error;
  if (payload.id) {
    ({ error } = await restUpdate(PARTNERS_TABLE, row, { id: payload.id }));
  } else {
    row.created_at = now;
    ({ error } = await restInsert(PARTNERS_TABLE, row));
  }
  if (error) {
    console.error('Error saving partner:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

export async function deletePartner(id) {
  if (!hasSupabase() || !hasServiceRole()) return { ok: false, reason: 'missing-service-role' };
  const { error } = await restDelete(PARTNERS_TABLE, { id });
  if (error) {
    console.error('Error deleting partner:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

export async function getManualReviews(approvedOnly = true, limit = 12) {
  if (!hasSupabase()) return { reviews: [] };
  try {
    const { data, error } = await restSelect(REVIEWS_TABLE, {
      order: [{ column: 'created_at', ascending: false }],
      limit,
      ...(approvedOnly ? { eqBool: { approved: true } } : {})
    });
    if (error) {
      console.error('Error reading manual reviews:', error);
      return { reviews: [] };
    }
    const reviews = (data || []).map((item) => ({
      id: item.id?.toString(),
      author_name: item.name,
      rating: item.rating ?? 5,
      text: item.text,
      relative_time_description: item.relative_time_description || 'nedávno',
      source: 'manual',
      approved: item.approved === true,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    return { reviews };
  } catch (err) {
    console.error('Unexpected error reading manual reviews:', err);
    return { reviews: [] };
  }
}

export async function createManualReview(payload) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const now = new Date().toISOString();
  const row = {
    name: payload.name,
    text: payload.text,
    rating: payload.rating ?? 5,
    approved: payload.approved ?? false,
    source: payload.source || 'manual',
    relative_time_description: payload.relativeTimeDescription || 'práve teraz',
    created_at: now,
    updated_at: now
  };

  const { error } = await restInsert(REVIEWS_TABLE, row);
  if (error) {
    console.error('Error saving manual review:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

export async function getStatistics() {
  if (!hasSupabase()) {
    return defaultStatistics;
  }

  try {
    const { data, error } = await restSelectOne(STATISTICS_TABLE, { eq: { id: 1 } });

    if (error) {
      console.error('Error reading statistics:', error);
      return defaultStatistics;
    }

    if (!data) return defaultStatistics;

    return {
      performedInspections: data.performed_inspections ?? defaultStatistics.performedInspections,
      yearsExperienceStart: data.years_experience_start ?? defaultStatistics.yearsExperienceStart,
      satisfactionPercentage: data.satisfaction_percentage ?? defaultStatistics.satisfactionPercentage,
      googlePlaceId: data.google_place_id ?? defaultStatistics.googlePlaceId
    };
  } catch (error) {
    console.error('Unexpected error reading statistics:', error);
    return defaultStatistics;
  }
}

export async function saveStatistics(stats) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const row = {
    id: 1,
    performed_inspections: stats.performedInspections ?? defaultStatistics.performedInspections,
    years_experience_start: stats.yearsExperienceStart ?? defaultStatistics.yearsExperienceStart,
    satisfaction_percentage: stats.satisfactionPercentage ?? defaultStatistics.satisfactionPercentage,
    google_place_id: stats.googlePlaceId ?? defaultStatistics.googlePlaceId,
    updated_at: new Date().toISOString()
  };

  const { error } = await restUpsert(STATISTICS_TABLE, row, 'id');
  if (error) {
    console.error('Error saving statistics:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}
