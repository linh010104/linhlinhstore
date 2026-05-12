class StorageHelper {
    /**
     * Get token from storage
     * @returns {string|null}
     */
    static getToken() {
        return localStorage.getItem("token");
    }

    /**
     * Set token in storage
     * @param {string} token
     */
    static setToken(token) {
        localStorage.setItem("token", token);
    }

    /**
     * Remove token from storage
     */
    static removeToken() {
        localStorage.removeItem("token");
    }

    /**
     * Get user object from storage
     * @returns {object|null}
     */
    static getUser() {
        const userJson = localStorage.getItem("user");
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Set user object in storage
     * @param {object} user
     */
    static setUser(user) {
        localStorage.setItem("user", JSON.stringify(user));
    }

    /**
     * Remove user from storage
     */
    static removeUser() {
        localStorage.removeItem("user");
    }

    /**
     * Clear all auth data
     */
    static clearAuth() {
        this.removeToken();
        this.removeUser();
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    static isLoggedIn() {
        return !!this.getToken();
    }
}