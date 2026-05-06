// IUCN Red List API v4 verification endpoint.
// Requires IUCN_API_TOKEN in env. When the token is missing, returns
// { verified: false, reason: 'no-token' } so the UI silently falls back
// to AI-detected values without surfacing an error.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const IUCN_API_BASE = 'https://api.iucnredlist.org/api/v4';

export async function POST(req) {
  try {
    const { scientificName, postId } = await req.json();

    if (!scientificName || typeof scientificName !== 'string') {
      return NextResponse.json({ verified: false, reason: 'no-scientific-name' }, { status: 400 });
    }

    const token = process.env.IUCN_API_TOKEN;
    if (!token) {
      return NextResponse.json({ verified: false, reason: 'no-token' });
    }

    // IUCN API v4 species lookup by scientific name. The exact endpoint
    // shape may evolve — confirm against current IUCN docs at
    // https://api.iucnredlist.org/ when implementing.
    const [genus, species] = scientificName.trim().split(/\s+/);
    if (!genus || !species) {
      return NextResponse.json({ verified: false, reason: 'invalid-scientific-name' });
    }

    const url = `${IUCN_API_BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}`;
    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (apiRes.status === 404) {
      return NextResponse.json({ verified: false, reason: 'not-found' });
    }
    if (!apiRes.ok) {
      console.error('[iucn/verify] API error', apiRes.status, await apiRes.text().catch(() => ''));
      return NextResponse.json({ verified: false, reason: 'api-error' });
    }

    const data = await apiRes.json();
    // Defensive shape — IUCN response may include nested assessments.
    // We pick the most-recent assessment's category code.
    const assessments = data?.assessments || data?.taxon?.assessments || [];
    const latest = Array.isArray(assessments) && assessments.length
      ? [...assessments].sort((a, b) => (b.year_published || 0) - (a.year_published || 0))[0]
      : null;
    const officialStatus = latest?.red_list_category?.code || data?.red_list_category?.code || null;
    const populationTrend = latest?.population_trend || data?.population_trend || 'unknown';
    const lastAssessmentYear = latest?.year_published || null;
    const assessmentId = latest?.assessment_id || null;

    if (!officialStatus) {
      return NextResponse.json({ verified: false, reason: 'no-assessment' });
    }

    // Persist verification on the post row, if a postId was supplied.
    if (postId) {
      try {
        const supabase = await createClient();
        await supabase.from('posts').update({
          iucn_status: officialStatus,
          iucn_verified: true,
          iucn_verified_at: new Date().toISOString(),
          scientific_name: scientificName,
        }).eq('id', postId);
      } catch (err) {
        console.warn('[iucn/verify] persistence failed (non-fatal):', err?.message);
      }
    }

    return NextResponse.json({
      verified: true,
      officialStatus,
      populationTrend,
      lastAssessmentYear,
      assessmentId,
    });
  } catch (err) {
    console.error('[iucn/verify]', err);
    return NextResponse.json({ verified: false, reason: 'api-error' }, { status: 500 });
  }
}
