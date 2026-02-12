/**
 * Custom API Error class
 * EXACT COPY of original APIError from api-client.js
 * @module lib/api/utils/APIError
 */

export class APIError extends Error {
    constructor(message: string, status: number = 0, data: any = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }

    status: number;
    data: any;
}

export default APIError;
