class APIHelper {
    constructor() {
        this.baseURL = CONFIG.BASE_URL;
        this.imageBaseURL = CONFIG.IMAGE_BASE_URL;
    }

    /**
     * Get token from localStorage
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem("token");
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Generic GET request with optional auth header
     * @param {string} endpoint - API endpoint (e.g., '/products/123')
     * @param {boolean} needsAuth - Whether to include Authorization header
     * @returns {Promise}
     */
    async get(endpoint, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        
        if (needsAuth) {
            const token = this.getToken();
            if (!token) throw new Error('Unauthorized: No token found');
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers
            });
            
            if (!response.ok) {
                // XỬ LÝ LỖI 401 TOÀN CỤC Ở ĐÂY
                if (response.status === 401) {
                    console.warn("Phát hiện token hết hạn qua API! Tự động dọn dẹp...");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "login.html";
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API GET Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Generic POST request with optional auth header
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {boolean} needsAuth - Whether to include Authorization header
     * @returns {Promise}
     */
    async post(endpoint, data = {}, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        
        if (needsAuth) {
            const token = this.getToken();
            if (!token) throw new Error('Unauthorized: No token found');
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                // XỬ LÝ LỖI 401 TOÀN CỤC Ở ĐÂY
                if (response.status === 401) {
                    console.warn("Phát hiện token hết hạn qua API! Tự động dọn dẹp...");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "login.html";
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API POST Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Generic PUT request with optional auth header
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {boolean} needsAuth - Whether to include Authorization header
     * @returns {Promise}
     */
    async put(endpoint, data = {}, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        
        if (needsAuth) {
            const token = this.getToken();
            if (!token) throw new Error('Unauthorized: No token found');
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                // XỬ LÝ LỖI 401 TOÀN CỤC Ở ĐÂY
                if (response.status === 401) {
                    console.warn("Phát hiện token hết hạn qua API! Tự động dọn dẹp...");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "login.html";
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API PUT Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Generic DELETE request
     * @param {string} endpoint - API endpoint
     * @param {boolean} needsAuth - Whether to include Authorization header
     * @returns {Promise}
     */
    async delete(endpoint, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        
        if (needsAuth) {
            const token = this.getToken();
            if (!token) throw new Error('Unauthorized: No token found');
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers
            });
            
            if (!response.ok) {
                // XỬ LÝ LỖI 401 TOÀN CỤC Ở ĐÂY
                if (response.status === 401) {
                    console.warn("Phát hiện token hết hạn qua API! Tự động dọn dẹp...");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "login.html";
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API DELETE Error [${endpoint}]:`, error);
            throw error;
        }
    }
}
const API = new APIHelper();