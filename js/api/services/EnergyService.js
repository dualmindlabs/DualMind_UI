/**
 * DualMind Energy Service
 * Handles user energy balance and claims
 * @module api/services/EnergyService
 */

/**
 * Energy Service - Energy operations
 */
export class EnergyService {
    /**
     * @param {import('../core/HttpClient.js').HttpClient} httpClient - HTTP client instance
     */
    constructor(httpClient) {
        this.http = httpClient;
    }

    /**
     * Get current user's energy balance
     * @returns {Promise<{balance: number}>} User energy balance
     */
    async getBalance() {
        return this.http.get('/api/energy/balance');
    }

    /**
     * Claim energy by watching a video
     * @returns {Promise<{balance: number, amount: number}>} New energy balance and amount claimed
     */
    async claimVideo() {
        return this.http.post('/api/energy/claim-video');
    }
}

export default EnergyService;
