import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, LoginCredentials } from '../types/auth';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials | string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: localStorage.getItem('token'),
        isAuthenticated: false,
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserData(token);
        }
    },);

    const fetchUserData = async (token: string) => {
        try {
            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAuthState({
                user: response.data.user,
                token,
                isAuthenticated: true,
            });
        } catch (error) {
            localStorage.removeItem('token');
            setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
            });
        }
    };

    const login = async (credentials: LoginCredentials | string) => {
        try {
            let token: string;
            let user: User;

            if (typeof credentials === 'string') {
                // Handle token directly (from signup)
                token = credentials;
                // Fetch user data after setting the token to localStorage
                localStorage.setItem('token', token);
                await fetchUserData(token);
                return; // Important: Exit the function after handling signup
            } else {
                // Handle login credentials
                const response = await axios.post(`${API_URL}/auth/login`, credentials);
                ({ user, token } = response.data);
            }

            localStorage.setItem('token', token);
            setAuthState({
                user,
                token,
                isAuthenticated: true,
            });
            toast.success('Successfully logged in!');
        } catch (error) {
            toast.error('Login failed. Please check your credentials.');
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
        });
        toast.success('Successfully logged out!');
    };

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}