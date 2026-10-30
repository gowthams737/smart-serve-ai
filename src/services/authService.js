const USER_KEY = 'smartserve_user';
const API_URL = 'http://localhost:5000/api/auth';

export const AuthService = {
    login: async (email, password, role) => {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
    },

    register: async (userData) => {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Registration failed');
        }
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
    },

    logout: () => {
        localStorage.removeItem(USER_KEY);
    },

    getCurrentUser: () => {
        try {
            const user = localStorage.getItem(USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('Failed to parse current user from localStorage:', e);
            return null;
        }
    },

    updateProfile: async (userData) => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-authenticated-email': currentUser.email || ''
            },
            body: JSON.stringify({ id: currentUser.id, email: currentUser.email, ...userData })
        });
        const data = await response.json();
        if (response.status === 404 || response.status === 401) {
            AuthService.logout();
            window.dispatchEvent(new Event('auth-invalidated'));
            throw new Error(data.message || 'Account not found in database. Session invalidated.');
        }
        if (!data.success) {
            throw new Error(data.message || 'Profile update failed');
        }
        // Merge returned user data with existing localStorage data to preserve all fields
        const merged = {
            ...currentUser,
            ...data.user,
            profileImage: data.user.profileImage || currentUser.profileImage,
            photo: data.user.profileImage || currentUser.profileImage,
            profilePhoto: data.user.profileImage || currentUser.profileImage
        };
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('profile-updated'));
        window.dispatchEvent(new CustomEvent('providerProfileUpdated', { detail: merged }));
        return merged;
    },

    // Update only profileImage locally and persist to backend
    updateProfileImage: async (profileImage) => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-authenticated-email': currentUser.email || ''
            },
            body: JSON.stringify({ id: currentUser.id, email: currentUser.email, profileImage })
        });
        const data = await response.json();
        if (response.status === 404 || response.status === 401) {
            AuthService.logout();
            window.dispatchEvent(new Event('auth-invalidated'));
            throw new Error(data.message || 'Account not found in database. Session invalidated.');
        }
        if (!data.success) {
            throw new Error(data.message || 'Profile image update failed');
        }
        const updatedImage = data.user.profileImage || profileImage;
        const merged = {
            ...currentUser,
            profileImage: updatedImage,
            photo: updatedImage,
            profilePhoto: updatedImage
        };
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('profile-updated'));
        window.dispatchEvent(new CustomEvent('providerProfileUpdated', { detail: merged }));
        return merged;
    },

    changePassword: async (currentPassword, newPassword) => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-authenticated-email': currentUser.email || ''
            },
            body: JSON.stringify({
                email: currentUser.email,
                currentPassword,
                newPassword
            })
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to change password');
        }
        return data;
    },

    uploadImage: async (base64Image) => {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to upload image');
        }
        return data.url;
    },

    verifySession: async () => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || !currentUser.email) return null;
        try {
            const role = currentUser.role || 'Customer';
            let endpoint = '';
            if (role === 'Customer') {
                endpoint = `http://localhost:5000/api/customer/profile/${encodeURIComponent(currentUser.email)}`;
            } else if (role === 'Provider') {
                endpoint = `http://localhost:5000/api/provider/profile/${encodeURIComponent(currentUser.email)}`;
            } else {
                endpoint = `http://localhost:5000/api/auth/verify-session?email=${encodeURIComponent(currentUser.email)}`;
            }
            const res = await fetch(endpoint, {
                headers: { 'x-authenticated-email': currentUser.email }
            });
            if (res.status === 404 || res.status === 401) {
                // User no longer exists in database! Clear stale session
                AuthService.logout();
                window.dispatchEvent(new Event('auth-invalidated'));
                return null;
            }
            const data = await res.json();
            if (!data.success) {
                AuthService.logout();
                window.dispatchEvent(new Event('auth-invalidated'));
                return null;
            }
            return currentUser;
        } catch (e) {
            return currentUser;
        }
    },

    isAuthenticated: () => {
        return !!localStorage.getItem(USER_KEY);
    }
};
