import type { Listing } from "../types";

/** Listing <-> Supabase `listings` row (snake_case). Income bands are stored as JSONB. */
export function listingToRow(l: Listing) {
  return {
    id: l.id,
    external_id: l.externalId,
    project_name: l.projectName,
    borough: l.borough,
    address: l.address,
    housing_program: l.housingProgram,
    unit_types: l.unitTypes,
    income_bands: l.incomeBands,
    restrictions: l.restrictions,
    is_rerental: l.isRerental,
    application_open_date: l.applicationOpenDate,
    application_deadline: l.applicationDeadline,
    application_url: l.applicationUrl,
    source_url: l.sourceUrl,
    status: l.status,
    last_verified_at: l.lastVerifiedAt,
    eligibility_notes: l.eligibilityNotes,
  };
}

export type ListingRow = ReturnType<typeof listingToRow>;

export function rowToListing(r: ListingRow): Listing {
  return {
    id: r.id,
    externalId: r.external_id,
    projectName: r.project_name,
    borough: r.borough,
    address: r.address,
    housingProgram: r.housing_program,
    unitTypes: r.unit_types ?? [],
    incomeBands: r.income_bands ?? [],
    restrictions: r.restrictions ?? [],
    isRerental: r.is_rerental,
    applicationOpenDate: r.application_open_date,
    applicationDeadline: r.application_deadline,
    applicationUrl: r.application_url,
    sourceUrl: r.source_url,
    status: r.status,
    lastVerifiedAt: r.last_verified_at,
    eligibilityNotes: r.eligibility_notes,
  };
}
