// Skeleton UI Component
export function renderSkeleton() {
    return `
    <div class="skeleton-loading">
      <div class="skeleton-turn">
        <div class="skeleton-prompt skeleton-shimmer"></div>
        <div class="skeleton-responses">
          <div class="skeleton-response skeleton-shimmer"></div>
          <div class="skeleton-response skeleton-shimmer"></div>
        </div>
      </div>
      <div class="skeleton-turn">
        <div class="skeleton-prompt skeleton-shimmer"></div>
        <div class="skeleton-responses">
          <div class="skeleton-response skeleton-shimmer"></div>
          <div class="skeleton-response skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  `;
}
