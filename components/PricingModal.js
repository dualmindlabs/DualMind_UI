export class PricingModal {
  constructor() {
    this.createModalDOM();
  }

  createModalDOM() {
    if (document.getElementById('pricing-modal')) return;

    const modalHTML = `
      <div id="pricing-modal" class="pricing-modal-overlay">
        <div class="pricing-modal-content">
          <button class="pricing-close-btn" aria-label="Close" data-action="close-pricing">✕</button>

          <div class="pricing-header">
            <h2>Unlock the Power of DualMind</h2>
            <p>Choose the plan that fits your workflow. Cancel anytime.</p>
          </div>

          <div class="pricing-grid">
            <!-- Energy Pack -->
            <div class="pricing-card">
              <div class="pricing-icon">💎</div>
              <h3 class="pricing-title">Energy Pack</h3>
              <div class="pricing-price">$1.99 <span>/ one-time</span></div>
              <ul class="pricing-features">
                <li>100 Energy Gems instantly</li>
                <li>Never expires</li>
                <li>Access to all standard models</li>
                <li>Standard response speed</li>
              </ul>
              <button class="pricing-btn pricing-btn-outline" data-action="buy-pack">Buy 100 Gems</button>
            </div>

            <!-- Pro Plan -->
            <div class="pricing-card featured">
              <div class="pricing-icon">🚀</div>
              <h3 class="pricing-title">DualMind Pro</h3>
              <div class="pricing-price">$9.99 <span>/ month</span></div>
              <ul class="pricing-features">
                <li><strong>Unlimited Energy</strong> (no limits)</li>
                <li>Priority queue for faster responses</li>
                <li>Early access to new experimental models</li>
                <li>Save unlimited conversation threads</li>
              </ul>
              <button class="pricing-btn pricing-btn-primary" data-action="subscribe-pro">Upgrade to Pro</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.modal = document.getElementById('pricing-modal');
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('[data-action="close-pricing"]');
    closeBtn.addEventListener('click', () => this.close());

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Buy Pack button
    const buyPackBtn = this.modal.querySelector('[data-action="buy-pack"]');
    buyPackBtn.addEventListener('click', () => {
      if (window.showToast) window.showToast('Redirecting to Stripe checkout...', 'info');
      // TODO: Replace with actual Stripe payment link
      setTimeout(() => {
        alert("This would redirect to Stripe Payment Link for the $1.99 gem pack.");
      }, 1000);
    });

    // Subscribe Pro button
    const subscribeBtn = this.modal.querySelector('[data-action="subscribe-pro"]');
    subscribeBtn.addEventListener('click', () => {
      if (window.showToast) window.showToast('Redirecting to Stripe checkout...', 'info');
      // TODO: Replace with actual Stripe payment link
      setTimeout(() => {
        alert("This would redirect to Stripe Payment Link for the $9.99/mo Pro subscription.");
      }, 1000);
    });
  }

  isOpen() {
    return this.modal.classList.contains('active');
  }

  open() {
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }
}

// Export singleton instance
export const pricingModal = new PricingModal();