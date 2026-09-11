// Generate The Story narrative from the frozen summary.
//
//   node scripts/generate-narrative.mjs --yes
//
// The cached narrative on the source report was written in June against older
// data (it cites 47 return visitors; the summary now has 8), so The Story would
// contradict The Numbers. This calls the product's own narrative endpoint with
// the frozen, renamed summary so both tabs describe the same numbers.
//
// It costs one model call. It writes nothing server-side: the RTDB cache write
// in the dashboard happens client-side, after the response.
import path from 'node:path';
import { config, FIXTURES_DIR, readJson, renameString, writeJson } from './lib/identity.mjs';

if (!process.argv.includes('--yes')) {
    console.error('Refusing to call the model without --yes (one billed request).');
    process.exit(1);
}

const data = readJson(path.join(FIXTURES_DIR, 'insights-summary.json'));

// Mirror the object generate_insight_summary builds for BQ reports
// (builder public/js/app-dashboard.js, BQ branch of generate_insight_summary).
const locationSummary = {};
(data.top_regions || []).forEach((r) => { locationSummary[r.region] = { total: r.views }; });
const insightsSummary = {
    source: 'bq',
    views: data.views,
    summary: {
        overview: { totalViews: data.views, pageSummary: null, locationSummary, constituentDetails: null },
        keyLabelMapping: null,
    },
    overview: null,
    avg_sections_viewed: data.avg_sections_viewed,
    avg_seconds_per_session: data.avg_seconds_per_session,
    avg_seconds_per_section: data.avg_seconds_per_section,
    unique_visitors: data.unique_visitors,
    anonymous_sessions: data.anonymous_sessions,
    return_visitors: data.return_visitors,
    constituent_count: data.constituent_count,
    constituent_return_visitors: data.constituent_return_visitors,
    top_cities: data.top_cities,
    hour_distribution: data.hour_distribution,
    top_constituents: data.top_constituents,
    all_regions: data.all_regions,
    geo_points: data.geo_points || null,
    all_constituents: data.all_constituents,
    report_sections: data.report_sections,
    section_flow: data.section_flow || null,
    link_clicks: data.link_clicks || null,
    engagement_heatmap_sessions: data.engagement_heatmap_sessions || [],
    engagement_heatmap_anchor_ms: data.heatmap_anchor_ms,
};

const resp = await fetch(config.source.narrative_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        mode: 'insights_summary',
        source: 'bq',
        // The real slugs let the server resolve section titles from the published toc.
        org_slug: config.source.org_slug,
        report_slug: config.source.report_slug,
        report_id: config.source.report_id,
        organizationName: config.identity.org_name,
        reportName: config.identity.report_title,
        insights_summary: insightsSummary,
    }),
});
const body = await resp.json();
if (!resp.ok || !body || body.error || !body.report) {
    throw new Error(`narrative failed: HTTP ${resp.status} ${JSON.stringify(body).slice(0, 300)}`);
}

const markdown = renameString(body.report);
writeJson(path.join(FIXTURES_DIR, 'narrative.json'), {
    generated_at: new Date().toISOString(),
    insights_narrative_md: markdown,
});
console.log(markdown);
