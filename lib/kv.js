import {
  hasSupabase,
  hasServiceRole,
  restCount,
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
const PAGE_VIEWS_TABLE = 'page_views';

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
      category: item.category || 'hero',
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
    category: payload.category || 'hlavny',
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
      source: item.source || 'manual',
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

export async function updateManualReview(id, payload) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const updateData = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.text !== undefined) updateData.text = payload.text;
  if (payload.rating !== undefined) updateData.rating = payload.rating;
  if (payload.approved !== undefined) updateData.approved = payload.approved;
  if (payload.relativeTimeDescription !== undefined) {
    updateData.relative_time_description = payload.relativeTimeDescription;
  }

  const { error } = await restUpdate(REVIEWS_TABLE, updateData, { id });
  if (error) {
    console.error('Error updating manual review:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

export async function deleteManualReview(id) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }
  const { error } = await restDelete(REVIEWS_TABLE, { id });
  if (error) {
    console.error('Error deleting manual review:', error);
    return { ok: false, reason: 'db-error', detail: error.message, code: error.code };
  }
  return { ok: true };
}

function mapReviewRow(item) {
  return {
    id: item.id?.toString(),
    author_name: item.name,
    rating: item.rating ?? 5,
    text: item.text,
    relative_time_description: item.relative_time_description || 'nedávno',
    source: item.source || 'manual',
    approved: item.approved === true,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

export async function getManualReviewStats(approvedOnly = true) {
  const { reviews } = await getManualReviews(approvedOnly, 500);
  if (!reviews.length) {
    return { count: 0, rating: null };
  }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  return {
    count: reviews.length,
    rating: Math.round((sum / reviews.length) * 10) / 10
  };
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

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function daysAgoIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function detectDevice(userAgent = '') {
  const ua = String(userAgent).toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|android|iphone/.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
}

function parseReferrerHost(referrer) {
  if (!referrer || typeof referrer !== 'string') return null;
  try {
    return new URL(referrer).hostname.slice(0, 200);
  } catch {
    return null;
  }
}

export async function recordPageView({ path, referrer, userAgent }) {
  if (!hasSupabase() || !hasServiceRole()) {
    return { ok: false, reason: 'missing-service-role' };
  }

  const row = {
    path: path.slice(0, 300),
    referrer_host: parseReferrerHost(referrer),
    device: detectDevice(userAgent)
  };

  const { error } = await restInsert(PAGE_VIEWS_TABLE, row);
  if (error) {
    console.error('Error recording page view:', error);
    return { ok: false, reason: 'db-error', detail: error.message };
  }
  return { ok: true };
}

function aggregateViewsByDay(rows) {
  const map = new Map();
  for (const row of rows) {
    const day = String(row.created_at || '').slice(0, 10);
    if (!day) continue;
    map.set(day, (map.get(day) || 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }));
}

function aggregateTopPaths(rows, limit = 8) {
  const map = new Map();
  for (const row of rows) {
    const p = row.path || '/';
    map.set(p, (map.get(p) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, views]) => ({ path, views }));
}

function aggregateReferrers(rows, limit = 6) {
  const map = new Map();
  for (const row of rows) {
    const host = row.referrer_host || '(priamy vstup)';
    map.set(host, (map.get(host) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([host, views]) => ({ host, views }));
}

function aggregateDevices(rows) {
  const map = new Map();
  for (const row of rows) {
    const device = row.device || 'unknown';
    map.set(device, (map.get(device) || 0) + 1);
  }
  return [...map.entries()].map(([device, views]) => ({ device, views }));
}

function fillDailySeries(daily, days) {
  const map = new Map((daily || []).map((d) => [d.date, d.views]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, views: map.get(key) || 0 });
  }
  return out;
}

function aggregateHourly(rows) {
  const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 }));
  for (const row of rows) {
    const created = row.created_at ? new Date(row.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const hour = created.getUTCHours();
    counts[hour].views += 1;
  }
  return counts;
}

const WEEKDAY_LABELS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];

function aggregateWeekday(rows) {
  const counts = WEEKDAY_LABELS.map((label, day) => ({ day, label, views: 0 }));
  for (const row of rows) {
    const created = row.created_at ? new Date(row.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const day = created.getUTCDay();
    counts[day].views += 1;
  }
  return counts;
}

function computeVisitSummary(rows, daily30, views7d, views30d) {
  const paths = new Set();
  for (const row of rows) {
    if (row.path) paths.add(row.path);
  }

  let peakDate = null;
  let peakViews = 0;
  for (const d of daily30 || []) {
    if (d.views > peakViews) {
      peakViews = d.views;
      peakDate = d.date;
    }
  }

  return {
    avgDaily7d: Math.round((views7d || 0) / 7),
    avgDaily30d: Math.round((views30d || 0) / 30),
    peakDate,
    peakViews,
    uniquePages: paths.size
  };
}

export async function getVisitAnalytics() {
  const empty = {
    configured: hasSupabase(),
    viewsToday: 0,
    views7d: 0,
    views30d: 0,
    viewsTotal: 0,
    daily: [],
    daily30: [],
    hourly: [],
    weekday: [],
    summary: {
      avgDaily7d: 0,
      avgDaily30d: 0,
      peakDate: null,
      peakViews: 0,
      uniquePages: 0
    },
    topPages: [],
    referrers: [],
    devices: [],
    content: {
      reviewsApproved: 0,
      reviewsPending: 0,
      partnersActive: 0,
      notificationsActive: 0
    }
  };

  if (!hasSupabase()) return empty;

  const todayIso = startOfUtcDay();
  const since7d = daysAgoIso(7);
  const since30d = daysAgoIso(30);
  const since30dRows = daysAgoIso(29);

  try {
    const [todayRes, d7Res, d30Res, totalRes, recentRes, reviewsRes, partnersRes, notifRes] =
      await Promise.all([
        restCount(PAGE_VIEWS_TABLE, { gte: { created_at: todayIso } }),
        restCount(PAGE_VIEWS_TABLE, { gte: { created_at: since7d } }),
        restCount(PAGE_VIEWS_TABLE, { gte: { created_at: since30d } }),
        restCount(PAGE_VIEWS_TABLE),
        restSelect(PAGE_VIEWS_TABLE, {
          select: 'path,referrer_host,device,created_at',
          gte: { created_at: since30dRows },
          order: [{ column: 'created_at', ascending: false }],
          limit: 15000
        }),
        restSelect(REVIEWS_TABLE, { select: 'approved' }),
        restSelect(PARTNERS_TABLE, { select: 'active', eqBool: { active: true } }),
        restSelect(NOTIFICATIONS_TABLE, { select: 'active', eqBool: { active: true } })
      ]);

    const rows = recentRes.data || [];
    const reviews = reviewsRes.data || [];
    const dailyRaw = aggregateViewsByDay(rows);
    const daily30 = fillDailySeries(dailyRaw, 30);
    const views7d = d7Res.count || 0;
    const views30d = d30Res.count || 0;

    return {
      configured: true,
      viewsToday: todayRes.count || 0,
      views7d,
      views30d,
      viewsTotal: totalRes.count || 0,
      daily: fillDailySeries(dailyRaw, 14),
      daily30,
      hourly: aggregateHourly(rows),
      weekday: aggregateWeekday(rows),
      summary: computeVisitSummary(rows, daily30, views7d, views30d),
      topPages: aggregateTopPaths(rows, 10),
      referrers: aggregateReferrers(rows, 8),
      devices: aggregateDevices(rows),
      content: {
        reviewsApproved: reviews.filter((r) => r.approved === true).length,
        reviewsPending: reviews.filter((r) => r.approved !== true).length,
        partnersActive: (partnersRes.data || []).length,
        notificationsActive: (notifRes.data || []).length
      }
    };
  } catch (err) {
    console.error('getVisitAnalytics:', err);
    return empty;
  }
}
