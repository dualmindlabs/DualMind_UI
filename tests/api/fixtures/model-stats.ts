// The v1 model-stats body as recorded on 2026-10-20 (docs/api/endpoints.md section 3.7), trimmed to
// two rows: every field twice (camelCase and snake_case) plus aliases.

export const recordedRows = [
  {"modelId":"fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5","modelName":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","displayName":"llama-3.3-70b-instruct-fp8-fast","providerName":"cloudflare","eloScore":1150.0,"eloRank":1,"totalWins":62,"totalLosses":27,"totalTies":9,"totalResponses":96,"winRate":64.58,"model_id":"fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5","model_name":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","display_name":"llama-3.3-70b-instruct-fp8-fast","provider_name":"cloudflare","elo_rating":1150.0,"elo":1150.0,"total_matches":96,"matches":96,"wins":62,"win_rate":64.58},
  {"modelId":"2f2219b0-d1ce-402d-b6d0-29d1e67ef04b","modelName":"@cf/meta/llama-3.1-70b-instruct","displayName":"llama-3.1-70b-instruct","providerName":"cloudflare","eloScore":1140.0,"eloRank":2,"totalWins":154,"totalLosses":55,"totalTies":36,"totalResponses":250,"winRate":61.6,"model_id":"2f2219b0-d1ce-402d-b6d0-29d1e67ef04b","model_name":"@cf/meta/llama-3.1-70b-instruct","display_name":"llama-3.1-70b-instruct","provider_name":"cloudflare","elo_rating":1140.0,"elo":1140.0,"total_matches":250,"matches":250,"wins":154,"win_rate":61.6},
];

export const recordedBody = { success: true, items: recordedRows };

/** What the design's example shows for those two rows (provisional threshold 5). */
export const expectedItems = [
  {"modelId":"fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5","modelName":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","displayName":"llama-3.3-70b-instruct-fp8-fast","providerName":"cloudflare","eloScore":1150,"eloRank":1,"totalWins":62,"totalLosses":27,"totalTies":9,"totalResponses":96,"winRate":64.58,"provisional":false},
  {"modelId":"2f2219b0-d1ce-402d-b6d0-29d1e67ef04b","modelName":"@cf/meta/llama-3.1-70b-instruct","displayName":"llama-3.1-70b-instruct","providerName":"cloudflare","eloScore":1140,"eloRank":2,"totalWins":154,"totalLosses":55,"totalTies":36,"totalResponses":250,"winRate":61.6,"provisional":false},
];

/** 53 rows, like the live board, ordered by rank, with a mix of casings. */
export function board(count = 53) {
  return Array.from({ length: count }, (_, index) => {
    const wins = 100 - index;
    const losses = 20 + index;
    const ties = index % 7;
    const total = wins + losses + ties;
    const base = {
      modelId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      modelName: `@cf/vendor/model-${index}`,
      providerName: index % 2 ? 'groq' : 'cloudflare',
      eloScore: 1300 - index * 3.25,
      eloRank: index + 1,
      totalWins: wins,
      totalLosses: losses,
      totalTies: ties,
      totalResponses: total,
    };
    // Every third row only has snake_case names.
    if (index % 3 === 0) {
      return { model_id: base.modelId, model_name: base.modelName, provider_name: base.providerName, elo_rating: base.eloScore, eloRank: base.eloRank, wins, losses, ties, matches: total };
    }
    return { ...base, displayName: `model-${index}`, winRate: Math.round((wins / total) * 10000) / 100 };
  });
}
